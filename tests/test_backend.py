import hashlib
import os
import sys
import time
import unittest
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT_DIR / "backend"
sys.path.insert(0, str(BACKEND_DIR))
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

import app as backend_app  # noqa: E402


INTEROP_SCRYPT_HASH = (
    "scrypt$16384$8$1$AAECAwQFBgcICQoLDA0ODw$"
    "T0m-Cy0394VmkIth_qzB02eARQEqio8wxu0sjsG6xdM2rlPdruFxMkrYT3DS-88tyquTbcH8o7rKKGngBOeOWQ"
)


class BackendSecurityTests(unittest.TestCase):
    @classmethod
    def tearDownClass(cls):
        backend_app.engine.dispose()

    def setUp(self):
        backend_app.RATE_LIMIT_BUCKETS.clear()
        self.client = backend_app.app.test_client()

    def register(self, username="audit-user", password="correct-horse"):
        response = self.client.post(
            "/api/auth/register",
            json={"username": username, "password": password},
        )
        self.assertEqual(response.status_code, 201)
        return response.get_json()["session"]

    def test_sync_requires_a_valid_revocable_session(self):
        auth_session = self.register()
        unauthorized = self.client.post("/api/sync/pull", json={"userId": auth_session["userId"]})
        self.assertEqual(unauthorized.status_code, 401)

        authorized = self.client.post(
            "/api/sync/pull",
            json={"userId": auth_session["userId"], "syncToken": auth_session["syncToken"]},
        )
        self.assertEqual(authorized.status_code, 200)

        logout = self.client.post("/api/auth/logout", json=auth_session)
        self.assertEqual(logout.status_code, 200)
        revoked = self.client.post(
            "/api/sync/pull",
            json={"userId": auth_session["userId"], "syncToken": auth_session["syncToken"]},
        )
        self.assertEqual(revoked.status_code, 401)

    def test_flask_verifies_the_password_hash_format_shared_with_node(self):
        self.assertTrue(backend_app.verify_password("interop-password", INTEROP_SCRYPT_HASH))
        self.assertFalse(backend_app.verify_password("wrong-password", INTEROP_SCRYPT_HASH))

    def test_sync_deletion_tombstone_prevents_stale_record_restore(self):
        auth_session = self.register(username="delete-user")
        now = int(time.time() * 1000)
        credentials = {
            "userId": auth_session["userId"],
            "syncToken": auth_session["syncToken"],
        }
        word = {"id": "word-1", "userId": auth_session["userId"], "term": "stable", "updatedAt": now}
        created = self.client.post(
            "/api/sync/push",
            json={**credentials, "collections": {"words": [word]}},
        )
        self.assertEqual(created.status_code, 200)

        deletion = {
            "id": "words:word-1",
            "collection": "words",
            "itemId": "word-1",
            "deletedAt": now + 1,
            "updatedAt": now + 1,
        }
        deleted = self.client.post(
            "/api/sync/push",
            json={**credentials, "collections": {"deletions": [deletion]}},
        )
        self.assertEqual(deleted.status_code, 200)

        stale_restore = self.client.post(
            "/api/sync/push",
            json={**credentials, "collections": {"words": [word]}},
        )
        self.assertEqual(stale_restore.status_code, 200)
        pulled = self.client.post("/api/sync/pull", json=credentials).get_json()["collections"]
        self.assertEqual(pulled["words"], [])
        self.assertEqual(len(pulled["deletions"]), 1)

    def test_legacy_account_migration_issues_a_modern_session_and_upgrades_on_login(self):
        legacy_hash = hashlib.sha256(b"legacy-password").hexdigest()
        with backend_app.Session(backend_app.engine) as database_session:
            database_session.add(
                backend_app.UserAccount(
                    id="user-legacy0001",
                    username="legacy-user",
                    username_normalized="legacy-user",
                    password_hash=legacy_hash,
                )
            )
            database_session.commit()

        migrated = self.client.post(
            "/api/auth/sync-local-user",
            json={
                "userId": "user-legacy0001",
                "username": "legacy-user",
                "passwordHash": legacy_hash,
            },
        )
        self.assertEqual(migrated.status_code, 200)
        self.assertTrue(migrated.get_json()["session"]["syncToken"].startswith("v2."))

        logged_in = self.client.post(
            "/api/auth/login",
            json={"username": "legacy-user", "password": "legacy-password"},
        )
        self.assertEqual(logged_in.status_code, 200)
        with backend_app.Session(backend_app.engine) as database_session:
            user = database_session.get(backend_app.UserAccount, "user-legacy0001")
            self.assertTrue(user.password_hash.startswith("scrypt$"))


if __name__ == "__main__":
    unittest.main()

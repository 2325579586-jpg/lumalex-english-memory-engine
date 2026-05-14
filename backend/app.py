import json
import os
import re
import socket
import uuid
import hashlib
from datetime import datetime
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse

import requests
from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory
from sqlalchemy import Boolean, DateTime, Integer, String, Text, UniqueConstraint, create_engine, inspect, or_, select, text
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column


load_dotenv(Path(__file__).with_name(".env"), override=False)


SYSTEM_LEXICONS = [
    {
        "id": "system-graduate",
        "key": "graduate",
        "slug": "graduate",
        "name": {"en": "Graduate Exam", "zh": "考研词汇"},
        "description": {
            "en": "Preparation lexicon for postgraduate entrance exam reading and writing.",
            "zh": "面向考研阅读与写作的系统词库。",
        },
        "scope": "system",
    },
    {
        "id": "system-cet4",
        "key": "cet4",
        "slug": "cet4",
        "name": {"en": "CET-4", "zh": "四级词汇"},
        "description": {
            "en": "Core college English words for CET-4 preparation.",
            "zh": "面向大学英语四级的核心词汇。",
        },
        "scope": "system",
    },
    {
        "id": "system-cet6",
        "key": "cet6",
        "slug": "cet6",
        "name": {"en": "CET-6", "zh": "六级词汇"},
        "description": {
            "en": "Higher-frequency exam words for CET-6 review and retention.",
            "zh": "面向大学英语六级的高频词汇。",
        },
        "scope": "system",
    },
    {
        "id": "system-ielts",
        "key": "ielts",
        "slug": "ielts",
        "name": {"en": "IELTS", "zh": "雅思词汇"},
        "description": {
            "en": "Useful words and phrases for IELTS speaking and writing.",
            "zh": "用于雅思口语与写作训练的词汇与短语。",
        },
        "scope": "system",
    },
]


SYSTEM_LEXICON_LOOKUP = {entry["id"]: entry for entry in SYSTEM_LEXICONS}
SYSTEM_KEY_LOOKUP = {entry["key"]: entry for entry in SYSTEM_LEXICONS}
BASE_DIR = Path(__file__).resolve().parent
LEGACY_FRONTEND_DIR = BASE_DIR.parent
REACT_FRONTEND_DIR = LEGACY_FRONTEND_DIR / "frontend"
REACT_DIST_DIR = REACT_FRONTEND_DIR / "dist"
SYSTEM_LEXICON_DATA_DIR = BASE_DIR / "system_lexicon_data"
SYSTEM_LEXICON_DATA_FILES = {
    "system-cet4": SYSTEM_LEXICON_DATA_DIR / "cet4.json",
    "system-cet6": SYSTEM_LEXICON_DATA_DIR / "cet6.json",
}
SYSTEM_LEXICON_ITEMS_CACHE: dict[str, list[dict]] = {}
APP_HOST = os.getenv("APP_HOST", "0.0.0.0")
APP_PORT = int(os.getenv("APP_PORT", "8000"))
PUBLIC_BASE_URL = os.getenv("PUBLIC_BASE_URL", "").strip()


def get_active_frontend_dir() -> Path:
    if (REACT_DIST_DIR / "index.html").exists():
        return REACT_DIST_DIR
    return LEGACY_FRONTEND_DIR


def normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", (value or "").strip().lower())


def detect_kind(text_value: str) -> str:
    return "phrase" if " " in (text_value or "").strip() else "word"


def slugify(value: str) -> str:
    normalized = normalize_text(value)
    slug = re.sub(r"[^a-z0-9]+", "-", normalized).strip("-")
    return slug or uuid.uuid4().hex[:10]


def format_pos_label(part_of_speech: str) -> str:
    mapping = {
        "noun": "n.",
        "verb": "v.",
        "adjective": "adj.",
        "adverb": "adv.",
        "pronoun": "pron.",
        "preposition": "prep.",
        "conjunction": "conj.",
        "interjection": "interj.",
        "article": "art.",
        "phrase": "phrase",
    }
    normalized = (part_of_speech or "").strip().lower()
    return mapping.get(normalized, part_of_speech or "n.")


def build_fallback_example(text_value: str) -> str:
    return f"Example: {text_value} becomes easier to remember when you meet it again in a real sentence."


def build_fallback_translation(text_value: str, kind: str) -> str:
    if kind == "phrase":
        return f'???????????{text_value}???????????'
    return f'?????????{text_value}?????????????'


def build_fallback_mnemonic(text_value: str, definition: str) -> str:
    return f'Mnemonic: connect "{text_value}" with this idea - {definition}'


def build_fallback_chinese_mnemonic(text_value: str, definition: str) -> str:
    return f'?????{text_value}?????????????{definition}'


def contains_cjk(value: str) -> bool:
    return bool(re.search(r"[\u4e00-\u9fff]", value or ""))


def build_fallback_meaning(text_value: str, kind: str) -> str:
    if kind == "phrase":
        return f'??{text_value}????????????????????????'
    return f'??{text_value}????????????????????????'


def fetch_dictionary_payload(text_value: str) -> Optional[dict]:
    try:
        response = requests.get(
            f"https://api.dictionaryapi.dev/api/v2/entries/en/{requests.utils.quote(text_value)}",
            timeout=20,
        )
        if not response.ok:
            return None
        payload = response.json()
        if not isinstance(payload, list) or not payload:
            return None
        return payload[0]
    except Exception:
        return None


def extract_audio_url(entry: Optional[dict]) -> str:
    if not isinstance(entry, dict):
        return ""
    for phonetic in entry.get("phonetics") or []:
        audio = (phonetic.get("audio") or "").strip()
        if audio:
            return audio
    return ""


def parse_dictionary_entry(entry: dict, original_text: str) -> Optional[dict]:
    if not isinstance(entry, dict):
        return None

    phonetic = entry.get("phonetic") or ""
    if not phonetic:
        phonetic = next((item.get("text") for item in entry.get("phonetics") or [] if item.get("text")), "")

    meanings = entry.get("meanings") or []
    primary_meaning = meanings[0] if meanings else {}
    definitions = primary_meaning.get("definitions") or []
    primary_definition = next((item for item in definitions if item.get("definition")), {})
    definition = primary_definition.get("definition") or ""
    if not definition:
        return None

    kind = detect_kind(original_text)
    chinese_meaning = build_fallback_meaning(original_text, kind)
    return {
        "text": original_text,
        "kind": kind,
        "phonetic": phonetic,
        "pos": format_pos_label(primary_meaning.get("partOfSpeech")),
        "meaning": chinese_meaning,
        "exampleEn": primary_definition.get("example") or build_fallback_example(original_text),
        "exampleZh": build_fallback_translation(original_text, kind),
        "mnemonicEn": build_fallback_mnemonic(original_text, definition),
        "mnemonicZh": build_fallback_chinese_mnemonic(original_text, chinese_meaning),
        "audioUrl": extract_audio_url(entry),
        "provider": "dictionaryapi",
    }


def fallback_enrichment(text_value: str, kind: str) -> dict:
    if kind == "word":
        dictionary_entry = fetch_dictionary_payload(text_value)
        if dictionary_entry:
            parsed = parse_dictionary_entry(dictionary_entry, text_value)
            if parsed:
                return parsed

    normalized_kind = kind if kind in {"word", "phrase"} else detect_kind(text_value)
    base_meaning = build_fallback_meaning(text_value, normalized_kind)
    return {
        "text": text_value,
        "kind": normalized_kind,
        "phonetic": "" if normalized_kind == "phrase" else f"/{normalize_text(text_value).replace(' ', '-')}/",
        "pos": "phrase" if normalized_kind == "phrase" else "n.",
        "meaning": base_meaning,
        "exampleEn": build_fallback_example(text_value),
        "exampleZh": build_fallback_translation(text_value, normalized_kind),
        "mnemonicEn": build_fallback_mnemonic(text_value, base_meaning),
        "mnemonicZh": build_fallback_chinese_mnemonic(text_value, base_meaning),
        "roots": [f"Observe the word form of {text_value} and split familiar prefix/root/suffix parts."],
        "synonyms": [],
        "antonyms": [],
        "collocations": [f"use {text_value} in context", f"{text_value} example sentence"],
        "audioUrl": "",
        "provider": "fallback",
    }


def generate_with_openai(text_value: str, kind: str) -> dict:
    api_key = os.getenv("COMPAT_API_KEY", "").strip() or os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("No compatible API key configured.")

    model = (
        os.getenv("COMPAT_MODEL", "").strip()
        or os.getenv("OPENAI_MODEL", "gpt-4.1-mini").strip()
        or "gpt-4.1-mini"
    )
    base_url = (os.getenv("COMPAT_BASE_URL", "").strip() or "https://api.openai.com/v1").rstrip("/")
    system_prompt = (
        "You generate clean English vocabulary study cards. "
        "Return strict JSON with keys: phonetic, pos, meaning, exampleEn, exampleZh, mnemonicEn, mnemonicZh, roots, synonyms, antonyms, collocations. "
        "Use concise, learner-friendly content. "
        "meaning must be concise Simplified Chinese, not English. "
        "exampleEn must be natural English. exampleZh must be clear Chinese. "
        "mnemonicZh must be Chinese. mnemonicEn must be short English support text. "
        "roots, synonyms, antonyms, and collocations must be arrays of short strings. "
        "For phrases, use pos='phrase'. "
        "Do not include markdown fences."
    )
    response = requests.post(
        f"{base_url}/chat/completions",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json={
            "model": model,
            "temperature": 0.4,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": f"Generate one study card for this {kind}: {text_value}. Return strict JSON only.",
                },
            ],
        },
        timeout=45,
    )
    response.raise_for_status()
    content = response.json()["choices"][0]["message"]["content"]
    parsed = json.loads(content)
    dictionary_entry = fetch_dictionary_payload(text_value) if kind == "word" else None

    meaning_value = (parsed.get("meaning") or "").strip()
    if not contains_cjk(meaning_value):
        raise RuntimeError("AI did not return a valid Simplified Chinese meaning.")

    return {
        "text": text_value,
        "kind": kind,
        "phonetic": parsed.get("phonetic", ""),
        "pos": parsed.get("pos", "phrase" if kind == "phrase" else "n."),
        "meaning": meaning_value,
        "exampleEn": parsed.get("exampleEn", build_fallback_example(text_value)),
        "exampleZh": parsed.get("exampleZh", build_fallback_translation(text_value, kind)),
        "mnemonicEn": parsed.get("mnemonicEn", build_fallback_mnemonic(text_value, meaning_value)),
        "mnemonicZh": parsed.get("mnemonicZh", build_fallback_chinese_mnemonic(text_value, meaning_value)),
        "roots": parsed.get("roots") if isinstance(parsed.get("roots"), list) else [],
        "synonyms": parsed.get("synonyms") if isinstance(parsed.get("synonyms"), list) else [],
        "antonyms": parsed.get("antonyms") if isinstance(parsed.get("antonyms"), list) else [],
        "collocations": parsed.get("collocations") if isinstance(parsed.get("collocations"), list) else [],
        "audioUrl": extract_audio_url(dictionary_entry),
        "provider": "compatible-llm",
    }


def describe_ai_error(error: Exception) -> tuple[str, int, str]:
    status_code = 502
    detail = str(error)

    if isinstance(error, requests.HTTPError) and error.response is not None:
        status_code = error.response.status_code
        try:
            payload = error.response.json()
            raw_error = payload.get("error") if isinstance(payload, dict) else None
            if isinstance(raw_error, dict):
                detail = raw_error.get("message") or raw_error.get("code") or detail
            elif raw_error:
                detail = str(raw_error)
            elif isinstance(payload, dict):
                detail = payload.get("message") or payload.get("code") or detail
        except Exception:
            detail = error.response.text[:300] or detail

    lowered = detail.lower()
    if status_code in {401, 403}:
        return "Qwen API 鉴权失败，请检查 COMPAT_API_KEY 是否有效。", status_code, detail
    if status_code == 429 or any(keyword in lowered for keyword in ["quota", "balance", "insufficient", "rate limit", "throttl"]):
        return "Qwen API 额度不足或触发限流，请检查阿里云百炼额度/账单，或稍后重试。", 429, detail
    if isinstance(error, requests.Timeout):
        return "Qwen API 响应超时，请稍后重试。", 504, detail
    if isinstance(error, requests.RequestException):
        return "Qwen API 网络请求失败，请检查后端网络或接口地址。", 502, detail
    if "chinese meaning" in lowered:
        return "AI 没有返回有效中文释义，已阻止写入模板假释义，请重新补全。", 502, detail
    return "AI 自动补全失败，请稍后重试。", status_code, detail


class Base(DeclarativeBase):
    pass


class UserAccount(Base):
    __tablename__ = "users"
    __table_args__ = (UniqueConstraint("username_normalized", name="uq_user_username_normalized"),)

    id: Mapped[str] = mapped_column(String(160), primary_key=True)
    username: Mapped[str] = mapped_column(String(120))
    username_normalized: Mapped[str] = mapped_column(String(120), index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

    def to_session(self) -> dict:
        return {
            "userId": self.id,
            "username": self.username,
            "loggedInAt": int(datetime.utcnow().timestamp() * 1000),
        }


class Lexicon(Base):
    __tablename__ = "lexicons"
    __table_args__ = (
        UniqueConstraint("user_key", "slug", name="uq_lexicon_user_slug"),
    )

    id: Mapped[str] = mapped_column(String(160), primary_key=True)
    user_key: Mapped[str] = mapped_column(String(120), index=True)
    slug: Mapped[str] = mapped_column(String(160), index=True)
    key: Mapped[str] = mapped_column(String(160), default="")
    name_en: Mapped[str] = mapped_column(String(255))
    name_zh: Mapped[str] = mapped_column(String(255), default="")
    description_en: Mapped[str] = mapped_column(Text, default="")
    description_zh: Mapped[str] = mapped_column(Text, default="")
    is_system: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

    def to_frontend(self, item_count: int = 0) -> dict:
        return {
            "id": self.id,
            "key": self.key or self.slug,
            "slug": self.slug,
            "name": {"en": self.name_en, "zh": self.name_zh or self.name_en},
            "description": {
                "en": self.description_en,
                "zh": self.description_zh or self.description_en,
            },
            "scope": "system" if self.is_system else "custom",
            "itemCount": item_count,
            "createdAt": int(self.created_at.timestamp() * 1000),
        }


class LexiconItem(Base):
    __tablename__ = "lexicon_items"
    __table_args__ = (
        UniqueConstraint("user_key", "normalized_text", name="uq_user_normalized_text"),
        UniqueConstraint("user_key", "client_item_id", name="uq_user_client_item_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_key: Mapped[str] = mapped_column(String(120), index=True)
    client_item_id: Mapped[str] = mapped_column(String(160), index=True)
    normalized_text: Mapped[str] = mapped_column(String(255), index=True)
    text: Mapped[str] = mapped_column(String(255))
    kind: Mapped[str] = mapped_column(String(40))
    phonetic: Mapped[str] = mapped_column(String(255), default="")
    pos: Mapped[str] = mapped_column(String(40), default="")
    category_en: Mapped[str] = mapped_column(String(120), default="")
    category_zh: Mapped[str] = mapped_column(String(120), default="")
    difficulty_en: Mapped[str] = mapped_column(String(120), default="")
    difficulty_zh: Mapped[str] = mapped_column(String(120), default="")
    meaning_en: Mapped[str] = mapped_column(Text)
    meaning_zh: Mapped[str] = mapped_column(Text)
    example_en: Mapped[str] = mapped_column(Text, default="")
    example_zh: Mapped[str] = mapped_column(Text, default="")
    mnemonic_en: Mapped[str] = mapped_column(Text, default="")
    mnemonic_zh: Mapped[str] = mapped_column(Text, default="")
    audio_url: Mapped[str] = mapped_column(Text, default="")
    lexicon_key: Mapped[str] = mapped_column(String(80), default="graduate", index=True)
    lexicon_id: Mapped[str] = mapped_column(String(160), default="", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

    def to_frontend(self) -> dict:
        return {
            "id": self.client_item_id,
            "text": self.text,
            "kind": self.kind,
            "phonetic": self.phonetic,
            "pos": self.pos,
            "category": {"en": self.category_en, "zh": self.category_zh or self.category_en},
            "difficulty": {"en": self.difficulty_en, "zh": self.difficulty_zh or self.difficulty_en},
            "meaning": {"en": self.meaning_en, "zh": self.meaning_zh or self.meaning_en},
            "example": {"en": self.example_en, "zh": self.example_zh or self.example_en},
            "mnemonic": {"en": self.mnemonic_en, "zh": self.mnemonic_zh or self.mnemonic_en},
            "audioUrl": self.audio_url or "",
            "lexiconKey": self.lexicon_key,
            "lexiconId": self.lexicon_id or "",
            "createdAt": int(self.created_at.timestamp() * 1000),
            "isCustom": True,
        }


class CloudSyncRecord(Base):
    __tablename__ = "cloud_sync_records"
    __table_args__ = (
        UniqueConstraint("user_id", "collection", "item_id", name="uq_cloud_sync_item"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(160), index=True)
    collection: Mapped[str] = mapped_column(String(80), index=True)
    item_id: Mapped[str] = mapped_column(String(200), index=True)
    payload_json: Mapped[str] = mapped_column(Text)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

    def to_payload(self) -> dict:
        try:
            return json.loads(self.payload_json)
        except Exception:
            return {}


database_url = os.getenv("DATABASE_URL", "sqlite:///lumalex-dev.db")
engine = create_engine(database_url, future=True)
Base.metadata.create_all(engine)


def ensure_schema_updates() -> None:
    inspector = inspect(engine)
    if "lexicon_items" in inspector.get_table_names():
        columns = {column["name"] for column in inspector.get_columns("lexicon_items")}
        if "audio_url" not in columns:
            with engine.begin() as connection:
                connection.execute(text("ALTER TABLE lexicon_items ADD COLUMN audio_url TEXT"))
        if "lexicon_id" not in columns:
            with engine.begin() as connection:
                connection.execute(text("ALTER TABLE lexicon_items ADD COLUMN lexicon_id VARCHAR(160) DEFAULT ''"))


ensure_schema_updates()

app = Flask(__name__)


@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, X-User-Key"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, DELETE, OPTIONS"
    return response


@app.get("/")
@app.get("/index.html")
def serve_index():
    frontend_dir = get_active_frontend_dir()
    return send_from_directory(frontend_dir, "index.html")


@app.route("/api/<path:_path>", methods=["OPTIONS"])
def preflight(_path: str):
    return ("", 204)


def get_user_key() -> str:
    return (
        request.headers.get("X-User-Key")
        or request.args.get("user_key")
        or (request.get_json(silent=True) or {}).get("user_key")
        or "demo-user"
    )


def normalize_username(value: str) -> str:
    return re.sub(r"\s+", "", (value or "").strip().lower())


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


SYNC_COLLECTIONS = {
    "decks",
    "words",
    "learnRecords",
    "reviewRecords",
    "sessions",
    "settings",
    "activeSessions",
}


def get_payload_timestamp(payload: dict) -> datetime:
    value = (
        payload.get("updatedAt")
        or payload.get("endedAt")
        or payload.get("startedAt")
        or payload.get("createdAt")
        or int(datetime.utcnow().timestamp() * 1000)
    )
    try:
        return datetime.utcfromtimestamp(int(value) / 1000)
    except Exception:
        return datetime.utcnow()


def get_sync_item_id(collection: str, payload: dict) -> str:
    if collection == "settings":
        return payload.get("userId") or payload.get("id") or "settings"
    return str(payload.get("id") or uuid.uuid4())


def get_system_lexicon_frontend(lexicon_id: str) -> Optional[dict]:
    system = SYSTEM_LEXICON_LOOKUP.get(lexicon_id)
    if not system:
        return None
    return {
        "id": system["id"],
        "key": system["key"],
        "slug": system["slug"],
        "name": system["name"],
        "description": system["description"],
        "scope": system["scope"],
        "itemCount": len(load_system_lexicon_items(lexicon_id)),
        "createdAt": 0,
    }


def load_system_lexicon_items(lexicon_id: str) -> list[dict]:
    if lexicon_id in SYSTEM_LEXICON_ITEMS_CACHE:
        return SYSTEM_LEXICON_ITEMS_CACHE[lexicon_id]

    data_path = SYSTEM_LEXICON_DATA_FILES.get(lexicon_id)
    if not data_path or not data_path.exists():
        SYSTEM_LEXICON_ITEMS_CACHE[lexicon_id] = []
        return []

    try:
        raw_items = json.loads(data_path.read_text(encoding="utf-8"))
    except Exception:
        SYSTEM_LEXICON_ITEMS_CACHE[lexicon_id] = []
        return []

    if not isinstance(raw_items, list):
        SYSTEM_LEXICON_ITEMS_CACHE[lexicon_id] = []
        return []

    system = SYSTEM_LEXICON_LOOKUP.get(lexicon_id, {})
    normalized_items: list[dict] = []
    for index, raw_item in enumerate(raw_items, start=1):
        if not isinstance(raw_item, dict):
            continue
        text_value = (raw_item.get("text") or "").strip()
        if not text_value:
            continue
        normalized_items.append(
            {
                "id": raw_item.get("id") or f"{lexicon_id}-{index:04d}",
                "text": text_value,
                "kind": raw_item.get("kind") or "word",
                "phonetic": (raw_item.get("phonetic") or "").strip(),
                "pos": (raw_item.get("pos") or "").strip(),
                "category": {"en": "", "zh": ""},
                "difficulty": {"en": "", "zh": ""},
                "meaning": {
                    "en": ((raw_item.get("meaning") or {}).get("en") if isinstance(raw_item.get("meaning"), dict) else "")
                    or "",
                    "zh": ((raw_item.get("meaning") or {}).get("zh") if isinstance(raw_item.get("meaning"), dict) else "")
                    or "",
                },
                "example": {"en": "", "zh": ""},
                "mnemonic": {"en": "", "zh": ""},
                "audioUrl": "",
                "lexiconKey": raw_item.get("lexiconKey") or system.get("key", ""),
                "lexiconId": raw_item.get("lexiconId") or lexicon_id,
                "createdAt": 0,
                "isCustom": False,
            }
        )

    SYSTEM_LEXICON_ITEMS_CACHE[lexicon_id] = normalized_items
    return normalized_items


def detect_local_ip() -> str:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
            sock.connect(("8.8.8.8", 80))
            return sock.getsockname()[0]
    except Exception:
        try:
            return socket.gethostbyname(socket.gethostname())
        except Exception:
            return "127.0.0.1"


def get_database_health_info() -> dict:
    parsed = urlparse(database_url)
    return {
        "configured": bool(database_url.strip()),
        "driver": parsed.scheme or "unknown",
        "host": parsed.hostname or "local-file",
        "name": parsed.path.rsplit("/", 1)[-1] if parsed.path else "",
    }


def resolve_lexicon_reference(item_payload: dict) -> tuple[str, str]:
    lexicon_id = (item_payload.get("lexiconId") or "").strip()
    lexicon_key = (item_payload.get("lexiconKey") or "").strip()
    if lexicon_id in SYSTEM_LEXICON_LOOKUP:
        system = SYSTEM_LEXICON_LOOKUP[lexicon_id]
        return lexicon_id, system["key"]
    if lexicon_key in SYSTEM_KEY_LOOKUP and not lexicon_id:
        system = SYSTEM_KEY_LOOKUP[lexicon_key]
        return system["id"], system["key"]
    return lexicon_id, lexicon_key or "graduate"


def build_item_from_payload(payload: dict) -> dict:
    item = payload.get("item") or {}
    text_value = (item.get("text") or "").strip()
    if not text_value:
        raise ValueError("Item text is required.")

    kind = item.get("kind") or detect_kind(text_value)
    client_item_id = item.get("id") or f"custom-{uuid.uuid4().hex[:12]}"

    category = item.get("category") or {}
    difficulty = item.get("difficulty") or {}
    meaning = item.get("meaning") or {}
    example = item.get("example") or {}
    mnemonic = item.get("mnemonic") or {}
    lexicon_id, lexicon_key = resolve_lexicon_reference(item)

    meaning_en = (meaning.get("en") or meaning.get("zh") or "").strip()
    if not meaning_en:
        raise ValueError("Meaning is required.")

    return {
        "client_item_id": client_item_id,
        "normalized_text": normalize_text(text_value),
        "text": text_value,
        "kind": kind,
        "phonetic": (item.get("phonetic") or "").strip(),
        "pos": (item.get("pos") or ("phrase" if kind == "phrase" else "n.")).strip(),
        "category_en": (category.get("en") or "").strip(),
        "category_zh": (category.get("zh") or category.get("en") or "").strip(),
        "difficulty_en": (difficulty.get("en") or "").strip(),
        "difficulty_zh": (difficulty.get("zh") or difficulty.get("en") or "").strip(),
        "meaning_en": meaning_en,
        "meaning_zh": (meaning.get("zh") or meaning_en).strip(),
        "example_en": (example.get("en") or "").strip(),
        "example_zh": (example.get("zh") or "").strip(),
        "mnemonic_en": (mnemonic.get("en") or "").strip(),
        "mnemonic_zh": (mnemonic.get("zh") or "").strip(),
        "audio_url": (item.get("audioUrl") or "").strip(),
        "lexicon_key": lexicon_key,
        "lexicon_id": lexicon_id,
    }


@app.get("/api/health")
def health():
    compat_key = os.getenv("COMPAT_API_KEY", "").strip() or os.getenv("OPENAI_API_KEY", "").strip()
    compat_base_url = os.getenv("COMPAT_BASE_URL", "").strip() or "https://api.openai.com/v1"
    compat_model = (
        os.getenv("COMPAT_MODEL", "").strip()
        or os.getenv("OPENAI_MODEL", "gpt-4.1-mini").strip()
        or "gpt-4.1-mini"
    )
    local_ip = detect_local_ip()
    local_access_url = f"http://{local_ip}:{APP_PORT}"
    return jsonify(
        {
            "ok": True,
            "provider": "compatible-llm" if compat_key else "fallback",
            "database": get_database_health_info(),
            "base_url": compat_base_url,
            "model": compat_model,
            "localIp": local_ip,
            "localAccessUrl": local_access_url,
            "publicBaseUrl": PUBLIC_BASE_URL,
        }
    )


@app.post("/api/enrich")
def enrich():
    payload = request.get_json(silent=True) or {}
    text_value = (payload.get("text") or "").strip()
    kind = payload.get("kind") or detect_kind(text_value)
    if not text_value:
        return jsonify({"error": "text is required"}), 400

    try:
        if not (os.getenv("COMPAT_API_KEY", "").strip() or os.getenv("OPENAI_API_KEY", "").strip()):
            return jsonify(
                {
                    "error": "未配置 Qwen/OpenAI 兼容 API Key，无法进行真实 AI 自动补全。",
                    "code": "missing_ai_key",
                }
            ), 503
        draft = generate_with_openai(text_value, kind)
    except Exception as error:
        message, status_code, detail = describe_ai_error(error)
        return jsonify(
            {
                "error": message,
                "detail": detail,
                "code": "ai_enrich_failed",
            }
        ), status_code

    return jsonify(draft)


@app.post("/api/auth/register")
def auth_register():
    payload = request.get_json(silent=True) or {}
    username = (payload.get("username") or "").strip()
    password = payload.get("password") or ""
    normalized = normalize_username(username)

    if len(normalized) < 3:
        return jsonify({"error": "账号至少需要 3 个字符。"}), 400
    if len(password.strip()) < 6:
        return jsonify({"error": "密码至少需要 6 个字符。"}), 400

    with Session(engine) as session:
        existing = session.scalar(select(UserAccount).where(UserAccount.username_normalized == normalized))
        if existing:
            return jsonify({"error": "这个账号已经存在，请直接登录。"}), 409

        now = datetime.utcnow()
        row = UserAccount(
            id=f"user-{uuid.uuid4().hex[:16]}",
            username=normalized,
            username_normalized=normalized,
            password_hash=hash_password(password),
            created_at=now,
            updated_at=now,
        )
        session.add(row)
        session.commit()
        session.refresh(row)
        return jsonify({"session": row.to_session()}), 201


@app.post("/api/auth/login")
def auth_login():
    payload = request.get_json(silent=True) or {}
    username = (payload.get("username") or "").strip()
    password = payload.get("password") or ""
    normalized = normalize_username(username)

    with Session(engine) as session:
        user = session.scalar(select(UserAccount).where(UserAccount.username_normalized == normalized))
        if not user:
            return jsonify({"error": "账号不存在，请先注册。"}), 404

        if user.password_hash != hash_password(password):
            return jsonify({"error": "密码错误，请重新输入。"}), 401

        user.updated_at = datetime.utcnow()
        session.add(user)
        session.commit()
        session.refresh(user)
        return jsonify({"session": user.to_session()}), 200


@app.post("/api/auth/sync-local-user")
def sync_local_user():
    payload = request.get_json(silent=True) or {}
    username = (payload.get("username") or "").strip()
    password_hash = (payload.get("passwordHash") or "").strip()
    preferred_user_id = (payload.get("userId") or "").strip()
    normalized = normalize_username(username)

    if len(normalized) < 3 or not password_hash:
        return jsonify({"error": "username and passwordHash are required"}), 400

    with Session(engine) as session:
        existing = session.scalar(select(UserAccount).where(UserAccount.username_normalized == normalized))
        if existing:
            if existing.password_hash != password_hash:
                return jsonify({"error": "账号已存在且密码不匹配，无法自动迁移。"}), 409
            return jsonify({"session": existing.to_session(), "synced": False}), 200

        now = datetime.utcnow()
        row = UserAccount(
            id=preferred_user_id or f"user-{uuid.uuid4().hex[:16]}",
            username=normalized,
            username_normalized=normalized,
            password_hash=password_hash,
            created_at=now,
            updated_at=now,
        )
        session.add(row)
        session.commit()
        session.refresh(row)
        return jsonify({"session": row.to_session(), "synced": True}), 201


@app.post("/api/sync/pull")
def sync_pull():
    payload = request.get_json(silent=True) or {}
    user_id = (payload.get("userId") or "").strip()
    if not user_id:
        return jsonify({"error": "userId is required"}), 400

    collections = {name: [] for name in SYNC_COLLECTIONS}
    with Session(engine) as session:
        rows = session.scalars(
            select(CloudSyncRecord).where(CloudSyncRecord.user_id == user_id).order_by(CloudSyncRecord.updated_at.asc())
        ).all()

    for row in rows:
        if row.collection in collections:
            item = row.to_payload()
            if item:
                collections[row.collection].append(item)

    return jsonify({"collections": collections, "syncedAt": int(datetime.utcnow().timestamp() * 1000)})


@app.post("/api/sync/push")
def sync_push():
    payload = request.get_json(silent=True) or {}
    user_id = (payload.get("userId") or "").strip()
    collections = payload.get("collections") or {}
    replace = bool(payload.get("replace"))
    if not user_id:
        return jsonify({"error": "userId is required"}), 400
    if not isinstance(collections, dict):
        return jsonify({"error": "collections must be an object"}), 400

    saved = 0
    now = datetime.utcnow()
    with Session(engine) as session:
        for collection, items in collections.items():
            if collection not in SYNC_COLLECTIONS or not isinstance(items, list):
                continue
            incoming_ids = {get_sync_item_id(collection, dict(item)) for item in items if isinstance(item, dict)}
            if replace:
                existing_rows = session.scalars(
                    select(CloudSyncRecord).where(
                        CloudSyncRecord.user_id == user_id,
                        CloudSyncRecord.collection == collection,
                    )
                ).all()
                for row in existing_rows:
                    if row.item_id not in incoming_ids:
                        session.delete(row)
            for raw_item in items:
                if not isinstance(raw_item, dict):
                    continue
                item = dict(raw_item)
                item["userId"] = user_id
                if collection == "settings":
                    item["id"] = user_id

                item_id = get_sync_item_id(collection, item)
                item_updated_at = get_payload_timestamp(item)
                existing = session.scalar(
                    select(CloudSyncRecord).where(
                        CloudSyncRecord.user_id == user_id,
                        CloudSyncRecord.collection == collection,
                        CloudSyncRecord.item_id == item_id,
                    )
                )
                if existing and existing.updated_at > item_updated_at:
                    continue

                payload_json = json.dumps(item, ensure_ascii=False, separators=(",", ":"))
                if existing:
                    existing.payload_json = payload_json
                    existing.updated_at = item_updated_at or now
                    session.add(existing)
                else:
                    session.add(
                        CloudSyncRecord(
                            user_id=user_id,
                            collection=collection,
                            item_id=item_id,
                            payload_json=payload_json,
                            updated_at=item_updated_at or now,
                        )
                    )
                saved += 1
        session.commit()

    return jsonify({"ok": True, "saved": saved, "syncedAt": int(datetime.utcnow().timestamp() * 1000)})


@app.get("/api/lexicons")
def list_lexicons():
    user_key = get_user_key()
    with Session(engine) as session:
        rows = session.scalars(
            select(Lexicon).where(Lexicon.user_key == user_key).order_by(Lexicon.created_at.desc())
        ).all()
        items = session.scalars(select(LexiconItem).where(LexiconItem.user_key == user_key)).all()

    custom_counts: dict[str, int] = {}
    for item in items:
        lexicon_id = item.lexicon_id or ""
        if lexicon_id:
            custom_counts[lexicon_id] = custom_counts.get(lexicon_id, 0) + 1

    system_frontend = [get_system_lexicon_frontend(entry["id"]) for entry in SYSTEM_LEXICONS]
    custom_frontend = [row.to_frontend(item_count=custom_counts.get(row.id, 0)) for row in rows]
    return jsonify({"lexicons": [*filter(None, system_frontend), *custom_frontend]})


@app.get("/api/lexicons/<lexicon_id>")
def get_lexicon(lexicon_id: str):
    system = get_system_lexicon_frontend(lexicon_id)
    if system:
        return jsonify({"lexicon": system})

    user_key = get_user_key()
    with Session(engine) as session:
        row = session.get(Lexicon, lexicon_id)
        if not row or row.user_key != user_key:
            return jsonify({"error": "lexicon not found"}), 404
        item_count = session.scalars(
            select(LexiconItem).where(LexiconItem.user_key == user_key, LexiconItem.lexicon_id == lexicon_id)
        ).all()
        return jsonify({"lexicon": row.to_frontend(item_count=len(item_count))})


@app.post("/api/lexicons")
def create_lexicon():
    user_key = get_user_key()
    payload = request.get_json(silent=True) or {}
    lexicon = payload.get("lexicon") or {}
    name = (lexicon.get("name") or "").strip()
    if not name:
        return jsonify({"error": "lexicon name is required"}), 400

    slug = slugify(lexicon.get("slug") or name)
    lexicon_id = f"custom-{slug}"
    description = (lexicon.get("description") or "").strip()

    with Session(engine) as session:
        existing = session.scalar(
            select(Lexicon).where(Lexicon.user_key == user_key, Lexicon.slug == slug)
        )
        if existing:
            return jsonify({"lexicon": existing.to_frontend(), "created": False}), 200

        row = Lexicon(
            id=lexicon_id,
            user_key=user_key,
            slug=slug,
            key=slug,
            name_en=name,
            name_zh=(lexicon.get("nameZh") or name).strip(),
            description_en=description,
            description_zh=(lexicon.get("descriptionZh") or description).strip(),
            is_system=False,
        )
        session.add(row)
        session.commit()
        session.refresh(row)
        return jsonify({"lexicon": row.to_frontend(), "created": True}), 201


@app.get("/api/lexicons/<lexicon_id>/items")
def get_lexicon_items(lexicon_id: str):
    if lexicon_id in SYSTEM_LEXICON_LOOKUP:
        return jsonify({"items": load_system_lexicon_items(lexicon_id)})

    user_key = get_user_key()
    with Session(engine) as session:
        lexicon_row = session.get(Lexicon, lexicon_id)
        lexicon_key = (lexicon_row.key if lexicon_row and lexicon_row.user_key == user_key else "") or ""
        rows = session.scalars(
            select(LexiconItem)
            .where(
                LexiconItem.user_key == user_key,
                or_(LexiconItem.lexicon_id == lexicon_id, LexiconItem.lexicon_key == lexicon_key),
            )
            .order_by(LexiconItem.created_at.desc())
        ).all()
    return jsonify({"items": [row.to_frontend() for row in rows]})


@app.delete("/api/lexicons/<lexicon_id>")
def delete_lexicon(lexicon_id: str):
    if lexicon_id in SYSTEM_LEXICON_LOOKUP or not lexicon_id.startswith("custom-"):
        return jsonify({"error": "system lexicons cannot be deleted"}), 403

    user_key = get_user_key()
    with Session(engine) as session:
        row = session.get(Lexicon, lexicon_id)
        if not row or row.user_key != user_key:
            return jsonify({"error": "lexicon not found"}), 404

        session.execute(
            text(
                "DELETE FROM lexicon_items "
                "WHERE user_key = :user_key AND (lexicon_id = :lexicon_id OR lexicon_key = :lexicon_key)"
            ),
            {"user_key": user_key, "lexicon_id": lexicon_id, "lexicon_key": row.key},
        )
        session.delete(row)
        session.commit()

    return jsonify({"deleted": True, "lexiconId": lexicon_id})


@app.get("/api/items")
def list_items():
    user_key = get_user_key()
    lexicon_id = (request.args.get("lexicon_id") or "").strip()
    lexicon_key = (request.args.get("lexicon_key") or "").strip()

    with Session(engine) as session:
        query = select(LexiconItem).where(LexiconItem.user_key == user_key).order_by(LexiconItem.created_at.desc())
        if lexicon_id:
            query = query.where(LexiconItem.lexicon_id == lexicon_id)
        elif lexicon_key:
            query = query.where(LexiconItem.lexicon_key == lexicon_key)
        rows = session.scalars(query).all()
    return jsonify({"items": [row.to_frontend() for row in rows]})


@app.post("/api/items")
def create_item():
    user_key = get_user_key()
    payload = request.get_json(silent=True) or {}
    try:
        item_data = build_item_from_payload(payload)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    with Session(engine) as session:
        existing = session.scalar(
            select(LexiconItem).where(
                LexiconItem.user_key == user_key,
                LexiconItem.normalized_text == item_data["normalized_text"],
            )
        )
        if existing:
            return jsonify({"item": existing.to_frontend(), "created": False}), 200

        row = LexiconItem(user_key=user_key, **item_data)
        session.add(row)
        session.commit()
        session.refresh(row)
        return jsonify({"item": row.to_frontend(), "created": True}), 201


@app.get("/<path:path>")
def serve_frontend_path(path: str):
    frontend_dir = get_active_frontend_dir()
    candidate = frontend_dir / path
    if candidate.is_file():
        return send_from_directory(frontend_dir, path)
    return send_from_directory(frontend_dir, "index.html")


if __name__ == "__main__":
    app.run(host=APP_HOST, port=APP_PORT, debug=False)

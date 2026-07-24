import json
import os
import re
import socket
import uuid
import hashlib
import base64
import hmac
import secrets
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional, Union
from urllib.parse import urlparse

import requests
from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory
from sqlalchemy import Boolean, DateTime, Integer, String, Text, UniqueConstraint, and_, create_engine, delete, func, inspect, or_, select, text
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column
from werkzeug.exceptions import HTTPException


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
        "id": "system-cet4-translation-phrases",
        "key": "cet4-translation-phrases",
        "slug": "cet4-translation-phrases",
        "name": {"en": "CET-4 Translation Phrases", "zh": "四级翻译短语词库"},
        "description": {
            "en": "High-frequency CET-4 translation phrases collected from the provided image notes.",
            "zh": "整理自图片资料的大学英语四级翻译常考短语和句型。",
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
    "system-cet4-translation-phrases": SYSTEM_LEXICON_DATA_DIR / "cet4-translation-phrases.json",
    "system-cet6": SYSTEM_LEXICON_DATA_DIR / "cet6.json",
}
SYSTEM_LEXICON_ITEMS_CACHE: dict[str, list[dict]] = {}
SYSTEM_LEXICON_CATEGORY_EN = {
    "动作": "Actions",
    "政治": "Politics",
    "经济": "Economy",
    "科技": "Technology",
    "生活": "Life",
    "环保": "Environment",
    "地理": "Geography",
    "文化": "Culture",
    "经济发展与改革": "Economic Development and Reform",
    "文化与传统": "Culture and Tradition",
    "社会与人民生活": "Society and People's Livelihood",
    "科技与创新": "Technology and Innovation",
    "环境与生态": "Environment and Ecology",
    "教育与人才": "Education and Talent",
    "政治与政策": "Politics and Policy",
    "旅游与地理": "Tourism and Geography",
    "健康与医疗": "Health and Medical Care",
    "行为与趋势": "Actions and Trends",
}
APP_HOST = os.getenv("APP_HOST", "0.0.0.0")
APP_PORT = int(os.getenv("APP_PORT", "8000"))
PUBLIC_BASE_URL = os.getenv("PUBLIC_BASE_URL", "").strip()


def get_active_frontend_dir() -> Path:
    if (REACT_DIST_DIR / "index.html").exists():
        return REACT_DIST_DIR
    return LEGACY_FRONTEND_DIR


def normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", (value or "").strip().lower())


def utc_epoch_ms(value: Optional[datetime] = None) -> int:
    moment = value or datetime.now(timezone.utc)
    if moment.tzinfo is None:
        moment = moment.replace(tzinfo=timezone.utc)
    return int(moment.timestamp() * 1000)


def utc_now_naive() -> datetime:
    """Return UTC without tzinfo for the existing cross-database DateTime columns."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def utc_datetime_from_ms(value: Union[float, int, str]) -> datetime:
    """Convert an epoch-millisecond value to the database's naive-UTC format."""
    return datetime.fromtimestamp(float(value) / 1000, timezone.utc).replace(tzinfo=None)


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
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now_naive, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now_naive, index=True)

    def to_session(self, sync_token: str) -> dict:
        return {
            "userId": self.id,
            "username": self.username,
            "syncToken": sync_token,
            "loggedInAt": utc_epoch_ms(),
        }


class AuthSession(Base):
    __tablename__ = "auth_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(160), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now_naive, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime, index=True)


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
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now_naive, index=True)

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
            "createdAt": utc_epoch_ms(self.created_at),
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
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now_naive, index=True)

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
            "createdAt": utc_epoch_ms(self.created_at),
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
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now_naive, index=True)

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
app.config["MAX_CONTENT_LENGTH"] = 1024 * 1024

CORS_ALLOWED_ORIGINS = {
    origin.strip()
    for origin in os.getenv("CORS_ALLOWED_ORIGINS", "").split(",")
    if origin.strip()
}
RATE_LIMIT_BUCKETS: dict[str, tuple[int, float]] = {}


@app.after_request
def add_cors_headers(response):
    origin = request.headers.get("Origin", "").strip()
    same_origin = request.host_url.rstrip("/")
    if origin and (origin == same_origin or origin in CORS_ALLOWED_ORIGINS):
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers.add("Vary", "Origin")
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, X-User-Key"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, DELETE, OPTIONS"
    response.headers["Cache-Control"] = "no-store" if request.path.startswith("/api/") else response.headers.get("Cache-Control", "no-cache")
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    return response


@app.get("/")
@app.get("/index.html")
def serve_index():
    frontend_dir = get_active_frontend_dir()
    return send_from_directory(frontend_dir, "index.html")


@app.route("/api/<path:_path>", methods=["OPTIONS"])
def preflight(_path: str):
    origin = request.headers.get("Origin", "").strip()
    if origin and origin != request.host_url.rstrip("/") and origin not in CORS_ALLOWED_ORIGINS:
        return jsonify({"error": "Origin is not allowed", "code": "CORS_ORIGIN_DENIED"}), 403
    return ("", 204)


@app.errorhandler(Exception)
def handle_unexpected_error(error: Exception):
    if isinstance(error, HTTPException):
        if request.path.startswith("/api/"):
            return jsonify({"error": error.description, "code": error.name.upper().replace(" ", "_")}), error.code
        return error
    app.logger.exception("Unhandled request error", exc_info=error)
    if request.path.startswith("/api/"):
        return jsonify({"error": "Internal server error", "code": "INTERNAL_ERROR"}), 500
    return "Internal server error", 500


def rate_limit_exceeded(bucket_name: str, maximum: int, window_seconds: int = 60) -> bool:
    now = time.monotonic()
    client = request.headers.get("X-Forwarded-For", request.remote_addr or "unknown").split(",")[0].strip()
    key = f"{bucket_name}:{client}"
    count, reset_at = RATE_LIMIT_BUCKETS.get(key, (0, now + window_seconds))
    if reset_at <= now:
        count, reset_at = 0, now + window_seconds
    count += 1
    RATE_LIMIT_BUCKETS[key] = (count, reset_at)
    if len(RATE_LIMIT_BUCKETS) > 2000:
        expired = [item_key for item_key, (_, item_reset_at) in RATE_LIMIT_BUCKETS.items() if item_reset_at <= now]
        for item_key in expired:
            RATE_LIMIT_BUCKETS.pop(item_key, None)
        while len(RATE_LIMIT_BUCKETS) > 2000:
            RATE_LIMIT_BUCKETS.pop(next(iter(RATE_LIMIT_BUCKETS)))
    return count > maximum


def get_user_key() -> str:
    return (
        request.headers.get("X-User-Key")
        or request.args.get("user_key")
        or (request.get_json(silent=True) or {}).get("user_key")
        or "demo-user"
    )


def normalize_username(value: str) -> str:
    return (value or "").strip().lower()


def is_valid_username(value: str) -> bool:
    return 3 <= len(value) <= 64 and not re.search(r"\s|[\x00-\x1f\x7f]", value)


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    derived = hashlib.scrypt(
        password.encode("utf-8"),
        salt=salt,
        n=16_384,
        r=8,
        p=1,
        dklen=64,
        maxmem=32 * 1024 * 1024,
    )
    salt_text = base64.urlsafe_b64encode(salt).decode("ascii").rstrip("=")
    hash_text = base64.urlsafe_b64encode(derived).decode("ascii").rstrip("=")
    return f"scrypt$16384$8$1${salt_text}${hash_text}"


def is_legacy_password_hash(value: str) -> bool:
    return bool(re.fullmatch(r"[a-f0-9]{64}", value or "", flags=re.IGNORECASE))


def verify_password(password: str, stored_hash: str) -> bool:
    if is_legacy_password_hash(stored_hash):
        legacy = hashlib.sha256(password.encode("utf-8")).hexdigest()
        return hmac.compare_digest(legacy, stored_hash)
    try:
        algorithm, n_raw, r_raw, p_raw, salt_raw, hash_raw = stored_hash.split("$", 5)
        if algorithm != "scrypt" or (int(n_raw), int(r_raw), int(p_raw)) != (16_384, 8, 1):
            return False
        salt = base64.urlsafe_b64decode(salt_raw + "=" * (-len(salt_raw) % 4))
        expected = base64.urlsafe_b64decode(hash_raw + "=" * (-len(hash_raw) % 4))
        actual = hashlib.scrypt(
            password.encode("utf-8"),
            salt=salt,
            n=16_384,
            r=8,
            p=1,
            dklen=len(expected),
            maxmem=32 * 1024 * 1024,
        )
        return hmac.compare_digest(actual, expected)
    except (ValueError, TypeError):
        return False


def issue_session(session: Session, user: UserAccount) -> dict:
    raw_token = f"v2.{secrets.token_urlsafe(32)}"
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    now = utc_now_naive()
    session.execute(delete(AuthSession).where(AuthSession.expires_at <= now))
    session.add(
        AuthSession(
            user_id=user.id,
            token_hash=token_hash,
            created_at=now,
            expires_at=now + timedelta(days=30),
        )
    )
    session.flush()
    stale_sessions = session.scalars(
        select(AuthSession)
        .where(AuthSession.user_id == user.id)
        .order_by(AuthSession.created_at.desc())
        .offset(8)
    ).all()
    for stale_session in stale_sessions:
        session.delete(stale_session)
    return user.to_session(raw_token)


def verify_sync_auth(session: Session, user_id: str, sync_token: str) -> bool:
    if not sync_token.startswith("v2.") or len(sync_token) > 128:
        return False
    token_hash = hashlib.sha256(sync_token.encode("utf-8")).hexdigest()
    row = session.scalar(
        select(AuthSession).where(
            AuthSession.user_id == user_id,
            AuthSession.token_hash == token_hash,
            AuthSession.expires_at > utc_now_naive(),
        )
    )
    return row is not None


SYNC_COLLECTIONS = {
    "decks",
    "words",
    "learnRecords",
    "reviewRecords",
    "sessions",
    "settings",
    "activeSessions",
    "deletions",
}


def get_payload_timestamp(payload: dict) -> datetime:
    value = (
        payload.get("updatedAt")
        or payload.get("endedAt")
        or payload.get("startedAt")
        or payload.get("createdAt")
        or utc_epoch_ms()
    )
    try:
        return utc_datetime_from_ms(int(value))
    except Exception:
        return utc_now_naive()


def get_sync_item_id(collection: str, payload: dict) -> str:
    if collection == "deletions":
        return str(payload.get("id") or (f"{payload.get('collection')}:{payload.get('itemId')}" if payload.get("collection") and payload.get("itemId") else ""))[:200]
    if collection == "settings":
        return str(payload.get("userId") or payload.get("id") or "settings")[:200]
    return str(payload.get("id") or payload.get("wordId") or payload.get("deckId") or "")[:200]


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


def get_localized_payload(value) -> dict:
    if isinstance(value, dict):
        return {
            "en": str(value.get("en") or "").strip(),
            "zh": str(value.get("zh") or "").strip(),
        }
    if isinstance(value, str):
        return {"en": "", "zh": value.strip()}
    return {"en": "", "zh": ""}


def normalize_compact_system_items(raw_payload, lexicon_id: str) -> list:
    if isinstance(raw_payload, list):
        return raw_payload
    if not isinstance(raw_payload, dict) or not isinstance(raw_payload.get("entries"), list):
        return []

    lexicon_key = raw_payload.get("key") or re.sub(r"^system-", "", lexicon_id)
    prefix = raw_payload.get("id") or lexicon_id
    normalized_items = []
    for index, entry in enumerate(raw_payload["entries"], start=1):
        if not isinstance(entry, list) or len(entry) < 2:
            continue
        text_value = str(entry[0] or "").strip()
        meaning_zh = str(entry[1] or "").strip()
        category_zh = str(entry[2] if len(entry) > 2 else "四级翻译").strip() or "四级翻译"
        if not text_value:
            continue
        normalized_items.append(
            {
                "id": f"{prefix}-{index:04d}",
                "text": text_value,
                "kind": "phrase",
                "pos": "phrase",
                "category": {
                    "en": SYSTEM_LEXICON_CATEGORY_EN.get(category_zh, "CET-4 Translation"),
                    "zh": category_zh,
                },
                "difficulty": {"en": "CET-4 translation", "zh": "四级翻译"},
                "meaning": {"en": text_value, "zh": meaning_zh},
                "lexiconKey": lexicon_key,
                "lexiconId": lexicon_id,
            }
        )
    return normalized_items


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

    raw_items = normalize_compact_system_items(raw_items, lexicon_id)
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
                "category": get_localized_payload(raw_item.get("category")),
                "difficulty": get_localized_payload(raw_item.get("difficulty")),
                "meaning": {
                    "en": ((raw_item.get("meaning") or {}).get("en") if isinstance(raw_item.get("meaning"), dict) else "")
                    or "",
                    "zh": ((raw_item.get("meaning") or {}).get("zh") if isinstance(raw_item.get("meaning"), dict) else "")
                    or "",
                },
                "example": get_localized_payload(raw_item.get("example")),
                "mnemonic": get_localized_payload(raw_item.get("mnemonic")),
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


WORD_RELATION_GROUPS = [
    {
        "type": "lookalike",
        "title": "长相近似",
        "description": "容易和当前单词看混、拼错或读错的词",
    },
    {
        "type": "synonym",
        "title": "近义词",
        "description": "意思接近，但语气或使用场景不同的词",
    },
    {
        "type": "antonym",
        "title": "反义词",
        "description": "意思相反或方向相反的词",
    },
    {
        "type": "derived",
        "title": "派生 / 相关词",
        "description": "由当前单词派生出的词、短语或高频相关表达",
    },
]
WORD_RELATION_CACHE: dict[str, dict] = {}


def relation_text(value) -> str:
    return str(value or "").strip()


def word_relation_cache_key(payload: dict) -> str:
    return "|".join(
        [
            normalize_text(relation_text(payload.get("word"))),
            relation_text(payload.get("partOfSpeech")).lower(),
            relation_text(payload.get("definition"))[:160],
            relation_text(payload.get("language")) or "zh-CN",
        ]
    )


def strip_json_fence(value: str) -> str:
    clean = relation_text(value)
    if not clean.startswith("```"):
        return clean
    clean = re.sub(r"^```(?:json)?\s*", "", clean, flags=re.I)
    clean = re.sub(r"\s*```$", "", clean, flags=re.I)
    return clean.strip()


def parse_llm_json_content(value: str) -> dict:
    clean = strip_json_fence(value)
    try:
        return json.loads(clean)
    except Exception:
        start = clean.find("{")
        end = clean.rfind("}")
        if start >= 0 and end > start:
            return json.loads(clean[start : end + 1])
        raise RuntimeError("LLM did not return valid JSON.")


def sanitize_relation_item(value) -> Optional[dict]:
    if not isinstance(value, dict):
        return None
    word = relation_text(value.get("word"))
    if not word:
        return None
    return {
        "word": word,
        "phonetic": relation_text(value.get("phonetic")),
        "partOfSpeech": relation_text(value.get("partOfSpeech")),
        "chinese": relation_text(value.get("chinese")),
        "note": relation_text(value.get("note")),
        "difference": relation_text(value.get("difference")),
        "example": relation_text(value.get("example")),
        "exampleZh": relation_text(value.get("exampleZh")),
    }


def is_single_english_word(value: str) -> bool:
    return bool(re.fullmatch(r"[A-Za-z]+", relation_text(value)))


def normalize_word_relations_response(payload, fallback_word: str) -> dict:
    source = payload if isinstance(payload, dict) else {}
    raw_groups = source.get("groups") if isinstance(source.get("groups"), list) else []
    group_map = {}
    for raw_group in raw_groups:
        if not isinstance(raw_group, dict):
            continue
        group_type = relation_text(raw_group.get("type"))
        meta = next((item for item in WORD_RELATION_GROUPS if item["type"] == group_type), None)
        if not meta:
            continue
        raw_items = raw_group.get("items") if isinstance(raw_group.get("items"), list) else []
        items = [item for item in (sanitize_relation_item(raw_item) for raw_item in raw_items) if item]
        if group_type == "lookalike":
            items = [item for item in items if is_single_english_word(item.get("word", ""))]
        items = items[:6]
        group_map[group_type] = {
            **meta,
            "title": relation_text(raw_group.get("title")) or meta["title"],
            "description": relation_text(raw_group.get("description")) or meta["description"],
            "items": items,
        }
    return {
        "word": relation_text(source.get("word")) or fallback_word,
        "groups": [group_map.get(group["type"], {**group, "items": []}) for group in WORD_RELATION_GROUPS],
    }


def build_word_relations_user_prompt(word: str, part_of_speech: str, definition: str) -> str:
    return f"""请为英文单词生成关系词卡片数据。

单词：{word}
词性：{part_of_speech}
中文释义：{definition}

要求：
1. 返回 4 个分组：
   - lookalike：长相近似、容易看错或拼错的词
   - synonym：近义词
   - antonym：反义词
   - derived：派生词、相关词或常见短语
2. 每组最多 6 个词。
3. 每个词都要适合英语学习场景。
4. 不要编造不存在的单词。
5. 长相近似词必须在拼写、字形或读音上容易混淆。
   - lookalike 分组只能返回单个连续英文单词，只能包含英文字母 A-Z/a-z。
   - lookalike 分组不要返回短语、固定搭配、带空格表达、带连字符表达或句子。
   - 如果找不到足够的长相近似单词，可以少于 6 个，不要用短语凑数。
6. 近义词必须说明和原词的细微区别。
7. 反义词必须说明和原词的反向关系。
8. 派生词可以包含不同词性、短语、固定搭配。
9. 中文解释要简洁准确。
10. 例句要自然、简单，适合中级英语学习者。
11. 只返回 JSON，格式如下：

{{
  "word": "{word}",
  "groups": [
    {{
      "type": "lookalike",
      "title": "长相近似",
      "description": "容易和当前单词看混、拼错或读错的词",
      "items": [
        {{
          "word": "string",
          "phonetic": "string",
          "partOfSpeech": "string",
          "chinese": "string",
          "note": "string",
          "difference": "string",
          "example": "string",
          "exampleZh": "string"
        }}
      ]
    }},
    {{
      "type": "synonym",
      "title": "近义词",
      "description": "意思接近，但语气或使用场景不同的词",
      "items": []
    }},
    {{
      "type": "antonym",
      "title": "反义词",
      "description": "意思相反或方向相反的词",
      "items": []
    }},
    {{
      "type": "derived",
      "title": "派生 / 相关词",
      "description": "由当前单词派生出的词、短语或高频相关表达",
      "items": []
    }}
  ]
}}"""


def generate_word_relations(payload: dict) -> dict:
    api_key = (
        os.getenv("LLM_API_KEY", "").strip()
        or os.getenv("COMPAT_API_KEY", "").strip()
        or os.getenv("OPENAI_API_KEY", "").strip()
    )
    if not api_key:
        raise RuntimeError("LLM_API_KEY, COMPAT_API_KEY, or OPENAI_API_KEY is required.")

    model = (
        os.getenv("LLM_MODEL", "").strip()
        or os.getenv("COMPAT_MODEL", "").strip()
        or os.getenv("OPENAI_MODEL", "gpt-4.1-mini").strip()
        or "gpt-4.1-mini"
    )
    base_url = (
        os.getenv("LLM_BASE_URL", "").strip()
        or os.getenv("COMPAT_BASE_URL", "").strip()
        or os.getenv("OPENAI_BASE_URL", "").strip()
        or "https://api.openai.com/v1"
    ).rstrip("/")
    system_prompt = (
        "你是一个专业的英语词汇学习助手。你的任务是为中国英语学习者生成准确、实用、适合背单词场景的关系词数据。"
        "你必须只返回合法 JSON，不要返回 Markdown，不要解释，不要添加多余文本。"
    )
    response = requests.post(
        f"{base_url}/chat/completions",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json={
            "model": model,
            "temperature": 0.35,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": build_word_relations_user_prompt(
                        relation_text(payload.get("word")),
                        relation_text(payload.get("partOfSpeech")),
                        relation_text(payload.get("definition")),
                    ),
                },
            ],
        },
        timeout=45,
    )
    response.raise_for_status()
    content = response.json()["choices"][0]["message"]["content"]
    return normalize_word_relations_response(parse_llm_json_content(content), relation_text(payload.get("word")))


@app.get("/api/health")
def health():
    compat_key = os.getenv("COMPAT_API_KEY", "").strip() or os.getenv("OPENAI_API_KEY", "").strip()
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
            "database": "online" if get_database_health_info().get("ok") else "offline",
            "model": compat_model,
            "localIp": local_ip,
            "localAccessUrl": local_access_url,
            "publicBaseUrl": PUBLIC_BASE_URL,
        }
    )


@app.post("/api/enrich")
def enrich():
    if rate_limit_exceeded("enrich", 30):
        return jsonify({"error": "Too many requests. Please try again later.", "code": "RATE_LIMITED"}), 429
    payload = request.get_json(silent=True) or {}
    text_value = (payload.get("text") or "").strip()
    kind = payload.get("kind") or detect_kind(text_value)
    if not text_value or len(text_value) > 120:
        return jsonify({"error": "text must contain 1–120 characters", "code": "INVALID_TEXT"}), 400

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
        message, status_code, _detail = describe_ai_error(error)
        return jsonify(
            {
                "error": message,
                "code": "ai_enrich_failed",
            }
        ), status_code

    return jsonify(draft)


@app.post("/api/word-relations")
def word_relations():
    if rate_limit_exceeded("word-relations", 20):
        return jsonify({"error": "Too many requests. Please try again later.", "code": "RATE_LIMITED"}), 429
    payload = request.get_json(silent=True) or {}
    word = relation_text(payload.get("word"))
    if not word or len(word) > 80:
        return jsonify({"error": "word relation input is invalid", "code": "INVALID_RELATION_INPUT"}), 400

    request_payload = {
        "word": word,
        "definition": relation_text(payload.get("definition")),
        "partOfSpeech": relation_text(payload.get("partOfSpeech")),
        "language": relation_text(payload.get("language")) or "zh-CN",
    }
    key = word_relation_cache_key(request_payload)
    if key in WORD_RELATION_CACHE:
        return jsonify(WORD_RELATION_CACHE[key])

    try:
        result = generate_word_relations(request_payload)
        WORD_RELATION_CACHE[key] = result
        while len(WORD_RELATION_CACHE) > 250:
            WORD_RELATION_CACHE.pop(next(iter(WORD_RELATION_CACHE)))
        return jsonify(result)
    except Exception as error:
        message, status_code, _detail = describe_ai_error(error)
        return jsonify({"error": message, "code": "word_relations_failed"}), status_code


@app.post("/api/auth/register")
def auth_register():
    if rate_limit_exceeded("auth-register", 5, 300):
        return jsonify({"error": "Too many requests. Please try again later.", "code": "RATE_LIMITED"}), 429
    payload = request.get_json(silent=True) or {}
    username = (payload.get("username") or "").strip()
    password = payload.get("password") or ""
    normalized = normalize_username(username)

    if not is_valid_username(normalized):
        return jsonify({"error": "账号需为 3–64 个不含空格的字符。", "code": "INVALID_USERNAME"}), 400
    if len(password) < 8 or len(password) > 256:
        return jsonify({"error": "密码需为 8–256 个字符。", "code": "INVALID_PASSWORD"}), 400

    with Session(engine) as session:
        existing = session.scalar(select(UserAccount).where(UserAccount.username_normalized == normalized))
        if existing:
            return jsonify({"error": "这个账号已经存在，请直接登录。"}), 409

        now = utc_now_naive()
        row = UserAccount(
            id=f"user-{uuid.uuid4().hex[:16]}",
            username=normalized,
            username_normalized=normalized,
            password_hash=hash_password(password),
            created_at=now,
            updated_at=now,
        )
        session.add(row)
        session.flush()
        auth_session = issue_session(session, row)
        session.commit()
        return jsonify({"session": auth_session}), 201


@app.post("/api/auth/login")
def auth_login():
    if rate_limit_exceeded("auth-login", 12):
        return jsonify({"error": "Too many requests. Please try again later.", "code": "RATE_LIMITED"}), 429
    payload = request.get_json(silent=True) or {}
    username = (payload.get("username") or "").strip()
    password = payload.get("password") or ""
    normalized = normalize_username(username)

    with Session(engine) as session:
        user = session.scalar(select(UserAccount).where(UserAccount.username_normalized == normalized))
        if not user:
            return jsonify({"error": "账号不存在，请先注册。"}), 404

        if not verify_password(password, user.password_hash):
            return jsonify({"error": "账号或密码错误。", "code": "INVALID_CREDENTIALS"}), 401

        user.updated_at = utc_now_naive()
        if is_legacy_password_hash(user.password_hash):
            user.password_hash = hash_password(password)
        session.add(user)
        auth_session = issue_session(session, user)
        session.commit()
        return jsonify({"session": auth_session}), 200


@app.post("/api/auth/sync-local-user")
def sync_local_user():
    if rate_limit_exceeded("auth-sync-local", 8):
        return jsonify({"error": "Too many requests. Please try again later.", "code": "RATE_LIMITED"}), 429
    payload = request.get_json(silent=True) or {}
    username = (payload.get("username") or "").strip()
    password_hash = (payload.get("passwordHash") or "").strip()
    preferred_user_id = (payload.get("userId") or "").strip()
    normalized = normalize_username(username)

    if not is_valid_username(normalized) or not is_legacy_password_hash(password_hash):
        return jsonify({"error": "Legacy account data is invalid", "code": "INVALID_LEGACY_ACCOUNT"}), 400
    if preferred_user_id and not re.fullmatch(r"user-[a-z0-9-]{8,80}", preferred_user_id, flags=re.IGNORECASE):
        preferred_user_id = ""

    with Session(engine) as session:
        existing = session.scalar(select(UserAccount).where(UserAccount.username_normalized == normalized))
        if existing:
            if not is_legacy_password_hash(existing.password_hash) or not hmac.compare_digest(existing.password_hash, password_hash):
                return jsonify({"error": "本地账号需要重新登录后才能继续同步。", "code": "LEGACY_REAUTH_REQUIRED"}), 409
            auth_session = issue_session(session, existing)
            session.commit()
            return jsonify({"session": auth_session, "synced": False}), 200

        now = utc_now_naive()
        row = UserAccount(
            id=preferred_user_id or f"user-{uuid.uuid4().hex[:16]}",
            username=normalized,
            username_normalized=normalized,
            password_hash=password_hash,
            created_at=now,
            updated_at=now,
        )
        session.add(row)
        session.flush()
        auth_session = issue_session(session, row)
        session.commit()
        return jsonify({"session": auth_session, "synced": True}), 201


@app.post("/api/auth/logout")
def auth_logout():
    payload = request.get_json(silent=True) or {}
    user_id = str(payload.get("userId") or "").strip()
    sync_token = str(payload.get("syncToken") or "").strip()
    if not user_id or not sync_token.startswith("v2."):
        return jsonify({"ok": True})
    token_hash = hashlib.sha256(sync_token.encode("utf-8")).hexdigest()
    with Session(engine) as session:
        session.execute(
            delete(AuthSession).where(
                AuthSession.user_id == user_id,
                AuthSession.token_hash == token_hash,
            )
        )
        session.commit()
    return jsonify({"ok": True})


@app.post("/api/sync/pull")
def sync_pull():
    payload = request.get_json(silent=True) or {}
    user_id = (payload.get("userId") or "").strip()
    sync_token = (payload.get("syncToken") or "").strip()
    since = payload.get("since")
    try:
        limit = min(max(int(payload.get("limit") or 250), 1), 1000)
    except (TypeError, ValueError):
        return jsonify({"error": "limit is invalid"}), 400
    cursor = str(payload.get("cursor") or "")
    if not user_id or len(user_id) > 160:
        return jsonify({"error": "userId is invalid"}), 400
    if not sync_token:
        return jsonify({"error": "Unauthorized"}), 401
    if cursor and not re.fullmatch(r"\d+:\d+", cursor):
        return jsonify({"error": "cursor is invalid"}), 400

    collections = {name: [] for name in SYNC_COLLECTIONS}
    with Session(engine) as session:
        if not verify_sync_auth(session, user_id, sync_token):
            return jsonify({"error": "Unauthorized"}), 401

        query = select(CloudSyncRecord).where(CloudSyncRecord.user_id == user_id)
        try:
            since_date = utc_datetime_from_ms(float(since)) if since and float(since) > 0 else None
        except (TypeError, ValueError, OverflowError):
            since_date = None
        if since_date:
            query = query.where(CloudSyncRecord.updated_at >= since_date)
        if cursor:
            cursor_time_raw, cursor_id_raw = cursor.split(":", 1)
            try:
                cursor_date = utc_datetime_from_ms(int(cursor_time_raw))
                cursor_id = int(cursor_id_raw)
            except (ValueError, OverflowError):
                return jsonify({"error": "cursor is invalid"}), 400
            query = query.where(
                or_(
                    CloudSyncRecord.updated_at > cursor_date,
                    and_(CloudSyncRecord.updated_at == cursor_date, CloudSyncRecord.id > cursor_id),
                )
            )
        rows = session.scalars(
            query.order_by(CloudSyncRecord.updated_at.asc(), CloudSyncRecord.id.asc()).limit(limit + 1)
        ).all()

    page_rows = rows[:limit]
    for row in page_rows:
        if row.collection in collections:
            item = row.to_payload()
            if item:
                collections[row.collection].append(item)

    last = page_rows[-1] if page_rows else None
    next_cursor = f"{utc_epoch_ms(last.updated_at)}:{last.id}" if len(rows) > limit and last else None
    return jsonify(
        {
            "collections": collections,
            "cursor": next_cursor,
            "hasMore": bool(next_cursor),
            "syncedAt": utc_epoch_ms(),
        }
    )


@app.post("/api/sync/push")
def sync_push():
    payload = request.get_json(silent=True) or {}
    user_id = (payload.get("userId") or "").strip()
    sync_token = (payload.get("syncToken") or "").strip()
    collections = payload.get("collections") or {}
    replace = bool(payload.get("replace") and payload.get("allowDestructiveReplace"))
    if not user_id or len(user_id) > 160:
        return jsonify({"error": "userId is invalid"}), 400
    if not sync_token:
        return jsonify({"error": "Unauthorized"}), 401
    if not isinstance(collections, dict):
        return jsonify({"error": "collections must be an object"}), 400
    item_count = sum(len(items) for items in collections.values() if isinstance(items, list))
    if item_count > 50:
        return jsonify({"error": "A sync request can contain at most 50 items"}), 413

    saved = 0
    rejected = 0
    now = utc_now_naive()
    with Session(engine) as session:
        if not verify_sync_auth(session, user_id, sync_token):
            return jsonify({"error": "Unauthorized"}), 401
        for collection, items in collections.items():
            if collection not in SYNC_COLLECTIONS or not isinstance(items, list):
                rejected += 1
                continue
            incoming_ids = {
                item_id
                for item in items
                if isinstance(item, dict)
                for item_id in [get_sync_item_id(collection, dict(item))]
                if item_id
            }
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
                    rejected += 1
                    continue
                item = dict(raw_item)
                item["userId"] = user_id
                if collection == "deletions":
                    target_collection = str(item.get("collection") or "").strip()
                    target_item_id = str(item.get("itemId") or "").strip()
                    deleted_at_raw = item.get("deletedAt") or item.get("updatedAt") or utc_epoch_ms(now)
                    try:
                        deleted_at = utc_datetime_from_ms(int(deleted_at_raw))
                    except (TypeError, ValueError, OverflowError):
                        rejected += 1
                        continue
                    if (
                        target_collection not in SYNC_COLLECTIONS
                        or target_collection == "deletions"
                        or not target_item_id
                        or len(target_item_id) > 200
                    ):
                        rejected += 1
                        continue
                    target = session.scalar(
                        select(CloudSyncRecord).where(
                            CloudSyncRecord.user_id == user_id,
                            CloudSyncRecord.collection == target_collection,
                            CloudSyncRecord.item_id == target_item_id,
                        )
                    )
                    if target and target.updated_at <= deleted_at:
                        session.delete(target)
                    item["id"] = f"{target_collection}:{target_item_id}"
                    item["deletedAt"] = utc_epoch_ms(deleted_at)
                    item["updatedAt"] = item["deletedAt"]
                elif collection == "settings":
                    item["id"] = user_id

                item_id = get_sync_item_id(collection, item)
                if not item_id:
                    rejected += 1
                    continue
                item_updated_at = get_payload_timestamp(item)
                if collection != "deletions":
                    deletion_row = session.scalar(
                        select(CloudSyncRecord).where(
                            CloudSyncRecord.user_id == user_id,
                            CloudSyncRecord.collection == "deletions",
                            CloudSyncRecord.item_id == f"{collection}:{item_id}",
                        )
                    )
                    if deletion_row and deletion_row.updated_at >= item_updated_at:
                        continue
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
                if len(payload_json.encode("utf-8")) > 96 * 1024:
                    rejected += 1
                    continue
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

    return jsonify({"ok": True, "saved": saved, "rejected": rejected, "syncedAt": utc_epoch_ms()})


@app.get("/api/lexicons")
def list_lexicons():
    user_key = get_user_key()
    with Session(engine) as session:
        rows = session.scalars(
            select(Lexicon).where(Lexicon.user_key == user_key).order_by(Lexicon.created_at.desc())
        ).all()
        count_rows = session.execute(
            select(LexiconItem.lexicon_id, func.count(LexiconItem.id))
            .where(LexiconItem.user_key == user_key, LexiconItem.lexicon_id != "")
            .group_by(LexiconItem.lexicon_id)
        ).all()

    custom_counts = {lexicon_id: item_count for lexicon_id, item_count in count_rows}

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
        item_count = session.scalar(
            select(func.count(LexiconItem.id)).where(
                LexiconItem.user_key == user_key,
                LexiconItem.lexicon_id == lexicon_id,
            )
        ) or 0
        return jsonify({"lexicon": row.to_frontend(item_count=item_count)})


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


@app.get("/api/lexicons/items")
def get_lexicon_items_by_query():
    lexicon_id = (request.args.get("lexiconId") or "").strip()
    if not lexicon_id:
        return jsonify({"error": "lexiconId is required"}), 400
    return get_lexicon_items(lexicon_id)


@app.get("/api/lexicons/<lexicon_id>/items")
def get_lexicon_items(lexicon_id: str):
    if lexicon_id in SYSTEM_LEXICON_LOOKUP:
        return jsonify(
            {
                "lexicon": get_system_lexicon_frontend(lexicon_id),
                "items": load_system_lexicon_items(lexicon_id),
            }
        )

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
    return jsonify(
        {
            "lexicon": lexicon_row.to_frontend(item_count=len(rows)) if lexicon_row else None,
            "items": [row.to_frontend() for row in rows],
        }
    )


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

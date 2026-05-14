import json
import re
from pathlib import Path

from pypdf import PdfReader


ROOT_DIR = Path(__file__).resolve().parent.parent
OUTPUT_DIR = Path(__file__).resolve().parent / "system_lexicon_data"

PDF_CONFIG = {
    "system-cet4": {
        "glob": "*四级*.pdf",
        "lexiconKey": "cet4",
        "output": OUTPUT_DIR / "cet4.json",
    },
    "system-cet6": {
        "glob": "*六级*.pdf",
        "lexiconKey": "cet6",
        "output": OUTPUT_DIR / "cet6.json",
    },
}

ROW_PATTERN = re.compile(
    r"^\s*(\d+)\s+([A-Za-z][A-Za-z\-']*(?:\s+[A-Za-z][A-Za-z\-']*)*)\s+(\[[^\]]+\])\s+(.+?)\s*$"
)
POS_PATTERN = re.compile(
    r"^(n\.\&v\.|v\.\&n\.|n&v\.|v&n\.|vt\.\&vi\.|vi\.\&vt\.|vt\.|vi\.|v\.|n\.|adj\.|a\.|adv\.|ad\.|prep\.|conj\.|pron\.|art\.|num\.|interj\.|phr\.|phrase)\s*",
    re.IGNORECASE,
)
POS_NORMALIZATION = {
    "a.": "adj.",
    "ad.": "adv.",
    "phr.": "phrase",
    "n&v.": "n.&v.",
    "v&n.": "v.&n.",
}


def normalize_pos(raw_pos: str) -> str:
    lowered = (raw_pos or "").strip().lower()
    return POS_NORMALIZATION.get(lowered, raw_pos.strip())


def parse_definition(raw_definition: str) -> tuple[str, str]:
    text = (raw_definition or "").strip()
    match = POS_PATTERN.match(text)
    if not match:
        return "", text

    pos = normalize_pos(match.group(1))
    meaning = text[match.end() :].strip()
    meaning = meaning.lstrip("；;，, ")
    return pos, meaning


def extract_items(pdf_path: Path, lexicon_id: str, lexicon_key: str) -> list[dict]:
    reader = PdfReader(str(pdf_path))
    items = []
    seen_words = set()

    for page in reader.pages:
        text = page.extract_text() or ""
        for line in text.splitlines():
            match = ROW_PATTERN.match(line.strip())
            if not match:
                continue

            word = match.group(2).strip()
            normalized_word = word.lower()
            if normalized_word in seen_words:
                continue
            seen_words.add(normalized_word)

            pos, meaning_zh = parse_definition(match.group(4))
            items.append(
                {
                    "id": f"{lexicon_id}-{len(items) + 1:04d}",
                    "text": word,
                    "kind": "word",
                    "phonetic": match.group(3).strip(),
                    "pos": pos,
                    "meaning": {"en": "", "zh": meaning_zh},
                    "lexiconId": lexicon_id,
                    "lexiconKey": lexicon_key,
                }
            )

    return items


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    summary = {}
    for lexicon_id, config in PDF_CONFIG.items():
        pdf_path = next(ROOT_DIR.glob(config["glob"]))
        items = extract_items(pdf_path, lexicon_id, config["lexiconKey"])
        config["output"].write_text(json.dumps(items, ensure_ascii=False, indent=2), encoding="utf-8")
        summary[lexicon_id] = {"pdf": pdf_path.name, "count": len(items), "output": str(config["output"].name)}

    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

"""비밀값을 출력하지 않고 역할→Jira accountId 반입 자료를 사전 검사한다."""

import argparse
import json
from pathlib import Path

REQUIRED_ROLES = {"support", "security"}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("map_file", type=Path)
    parser.add_argument("--candidates-file", type=Path)
    args = parser.parse_args()

    mapping = json.loads(args.map_file.read_text(encoding="utf-8"))
    if not isinstance(mapping, dict) or set(mapping) != REQUIRED_ROLES:
        raise SystemExit("FAIL: support/security 두 역할만 정확히 필요합니다.")
    if not all(isinstance(value, str) and value.strip() for value in mapping.values()):
        raise SystemExit("FAIL: 각 역할의 accountId가 비어 있습니다.")
    if len(set(mapping.values())) != len(mapping):
        raise SystemExit("FAIL: 두 역할에 같은 accountId를 사용할 수 없습니다.")

    if args.candidates_file:
        candidates = json.loads(args.candidates_file.read_text(encoding="utf-8"))
        allowed = {
            item.get("accountId")
            for item in candidates
            if isinstance(item, dict)
            and item.get("active") is True
            and item.get("accountType") == "atlassian"
        }
        if not set(mapping.values()) <= allowed:
            raise SystemExit("FAIL: 매핑 계정 중 Jira 배정 가능 후보가 아닌 계정이 있습니다.")

    print("PASS: 역할 2개와 배정 가능 여부를 확인했습니다. accountId는 출력하지 않습니다.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

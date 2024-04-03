import json
import re


def printJson(data) -> None:
    print(json.dumps(data, indent=2, sort_keys=True), end=",", flush=True)


def printString(data: str) -> None:
    if data != "":
        print(
            json.dumps(
                re.sub(r"(\.|\?|\!|\:)(\s?)", r"\1\2\r\n", data),
                indent=2,
                sort_keys=True,
            ),
            end=",",
            flush=True,
        )

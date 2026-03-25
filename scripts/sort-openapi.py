import argparse
from ruamel.yaml import YAML

def sort_dict(d):
    """
    Sorts a dictionary (or CommentedMap) in-place by keys.
    Preserves the ruamel.yaml CommentedMap type to keep comments.
    """
    if isinstance(d, dict):
        for key in sorted(d.keys()):
            d.move_to_end(key)
    return d

def main():
    parser = argparse.ArgumentParser(description="Sort OpenAPI components in a YAML file.")
    parser.add_argument("input", help="Path to input YAML file")
    parser.add_argument("output", help="Path to output YAML file")
    args = parser.parse_args()

    yaml = YAML()
    yaml.preserve_quotes = True

    with open(args.input, "r", encoding="utf-8") as f:
        doc = yaml.load(f)

    components = doc.get("components")
    if components:
        for section in ["schemas", "parameters", "responses", "securitySchemes"]:
            if section in components:
                sort_dict(components[section])

    doc["components"] = components

    with open(args.output, "w", encoding="utf-8") as f:
        yaml.dump(doc, f)

if __name__ == "__main__":
    main()
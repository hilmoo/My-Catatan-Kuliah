import yaml
import argparse

def sort_dict(d):
    if isinstance(d, dict):
        return dict(sorted(d.items(), key=lambda x: x[0]))
    return d

def main():
    parser = argparse.ArgumentParser(description="Sort OpenAPI components in a YAML file.")
    parser.add_argument("input", help="Path to input YAML file")
    parser.add_argument("output", help="Path to output YAML file")
    args = parser.parse_args()

    with open(args.input, "r", encoding="utf-8") as f:
        doc = yaml.safe_load(f)

    components = doc.get("components", {})

    components["schemas"] = sort_dict(components.get("schemas", {}))
    components["parameters"] = sort_dict(components.get("parameters", {}))
    components["responses"] = sort_dict(components.get("responses", {}))
    components["securitySchemes"] = sort_dict(components.get("securitySchemes", {}))

    doc["components"] = components

    with open(args.output, "w", encoding="utf-8") as f:
        yaml.dump(doc, f, sort_keys=False)

if __name__ == "__main__":
    main()
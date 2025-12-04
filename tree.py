import os

def print_tree(start_path, prefix=""):
    items = os.listdir(start_path)
    for i, item in enumerate(items):
        path = os.path.join(start_path, item)
        connector = "└── " if i == len(items) - 1 else "├── "
        print(prefix + connector + item)
        if os.path.isdir(path):
            new_prefix = prefix + ("    " if i == len(items)-1 else "│   ")
            print_tree(path, new_prefix)

print_tree(".")

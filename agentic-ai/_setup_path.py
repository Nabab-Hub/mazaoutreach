import sys
import os
import importlib.util
from pathlib import Path

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# Add agentic-ai directory to sys.path so direct imports work everywhere
agentic_dir = Path(__file__).resolve().parent
if str(agentic_dir) not in sys.path:
    sys.path.insert(0, str(agentic_dir))

# Also map agentic_ai in sys.modules so package imports work without needing a second folder
if "agentic_ai" not in sys.modules:
    spec = importlib.util.spec_from_file_location(
        "agentic_ai",
        agentic_dir / "__init__.py",
        submodule_search_locations=[str(agentic_dir)]
    )
    if spec and spec.loader:
        mod = importlib.util.module_from_spec(spec)
        sys.modules["agentic_ai"] = mod
        spec.loader.exec_module(mod)

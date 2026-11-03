import sys
import importlib.util
from pathlib import Path

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# Dynamically map the hyphenated 'agentic-ai' directory to 'agentic_ai' package
agentic_dir = Path(__file__).resolve().parent
if "agentic_ai" not in sys.modules:
    spec = importlib.util.spec_from_file_location(
        "agentic_ai",
        agentic_dir / "__init__.py",
        submodule_search_locations=[str(agentic_dir)]
    )
    mod = importlib.util.module_from_spec(spec)
    sys.modules["agentic_ai"] = mod
    if spec and spec.loader:
        spec.loader.exec_module(mod)

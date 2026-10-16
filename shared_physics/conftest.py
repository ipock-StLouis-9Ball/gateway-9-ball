import types
import sys
import os

pkg_dir = os.path.abspath(os.path.join(os.path.dirname(__file__)))

pooltool_pkg = types.ModuleType("pooltool")
pooltool_pkg.__path__ = [pkg_dir]
sys.modules["pooltool"] = pooltool_pkg

constants_module = types.ModuleType("pooltool.constants")
constants_module.use_numba_cache = False
sys.modules["pooltool.constants"] = constants_module

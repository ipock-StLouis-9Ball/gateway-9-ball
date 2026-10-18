## 2025-05-18 - [Python Bool Subclass Type Coercion in Physics Validation]
**Vulnerability:** In Python, `bool` is a subclass of `int` (`isinstance(True, int)` is `True`). Shot parameter validation in physics simulation engines checking `isinstance(val, (int, float))` allows boolean flags (`True` / `False`) to pass as numeric parameters (`1` or `0`), bypassing strict numeric input constraints.
**Learning:** Checking parameter types using standard `isinstance(x, (int, float))` without explicitly rejecting `bool` instances allows boolean parameter injection.
**Prevention:** Always check `if isinstance(param, bool): return False` before applying integer or floating point range checks on sensitive numeric input validation methods.

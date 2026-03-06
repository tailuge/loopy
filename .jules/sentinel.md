## 2025-05-14 - [Command Injection in grep Tool]
**Vulnerability:** The `grep` tool used `child_process.exec` with string interpolation of user-provided patterns and paths, allowing for arbitrary shell command execution (e.g., via `` or `; command`).
**Learning:** Manual escaping of shell characters (like `replace(/"/g, '\\"')`) is often insufficient and error-prone. It's much safer to avoid the shell entirely when executing known binaries.
**Prevention:** Use `child_process.execFile` and pass arguments as an array. Additionally, use the `--` flag to prevent option injection if the input starts with a hyphen.

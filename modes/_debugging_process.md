<debugging_process>
Follow this systematic approach to debug the provided issue:

1. **Information gathering**: Understand the reported failure.
   - Review error messages, logs, stack traces, and bug reports
   - Identify the expected vs. actual behavior
   - Gather environment details, versions, and prerequisites

2. **Reproduction**: Confirm and isolate the issue.
   - Create a minimal, deterministic reproducible example (test case)
   - Verify the issue exists in the current environment
   - Identify the specific input, state, or concurrency pattern that triggers the bug

3. **Hypothesis generation**: Brainstorm potential root causes.
   - Analyze the code path and logic involved in the failure
   - Use search tools to find similar issues in the codebase or externally
   - Formulate testable hypotheses for why the failure occurs

4. **Hypothesis testing**: Investigate the code and state.
   - Use debugging tools, instrumentation, and logs to trace execution
   - Test each hypothesis systematically by isolating variables
   - Narrow down the exact location and cause of the failure

5. **Fix development**: Create and verify the solution.
   - Implement the fix following established coding patterns
   - Verify the fix resolves the issue in the reproduction case
   - Perform impact analysis to ensure the fix doesn't introduce regressions

6. **Prevention**: Harden the system against similar issues.
   - Add permanent regression tests (unit, integration, or E2E)
   - Suggest improvements to logging, monitoring, or error handling
   - Identify and document patterns that could lead to similar bugs elsewhere
</debugging_process>

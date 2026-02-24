# Claude Code Instructions

## Project Overview

This is a TypeScript React Native mobile app. All components are TypeScript/TSX.

## UI Implementation

- Before writing any code from a design mockup or screenshot, describe the layout hierarchy you see: element positioning, spacing relationships, and nesting. Wait for confirmation before coding.
- Make ONE visual change at a time and confirm it looks correct before proceeding. Avoid changing multiple style properties simultaneously.
- If the first approach doesn't match the target design after 3 attempts, stop patching and either rebuild from scratch or ask for clarification.

## Debugging

- This is a React Native project. When debugging layout or rendering issues, check React Native's flexbox model (which differs from web CSS) and platform-specific behavior before trying generic CSS approaches.
- When stuck on a layout bug, explain what you think the root cause is before attempting a fix. If 3 attempts at the same approach fail, propose a fundamentally different strategy rather than continuing to patch.

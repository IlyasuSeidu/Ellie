# Contributing to Ellie

Thank you for your interest in contributing to Ellie! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Style Guide](#code-style-guide)
- [Commit Message Format](#commit-message-format)
- [Pull Request Process](#pull-request-process)
- [Testing Requirements](#testing-requirements)
- [Documentation](#documentation)
- [Issue Reporting](#issue-reporting)

## Code of Conduct

### Our Standards

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on what is best for the community
- Show empathy towards other community members
- Accept constructive criticism gracefully

### Unacceptable Behavior

- Harassment, discrimination, or offensive comments
- Publishing others' private information
- Trolling or insulting/derogatory comments
- Any conduct that could reasonably be considered inappropriate

## Getting Started

### Prerequisites

Ensure you have the following installed:

- Node.js v18.x or later
- npm v9.x or later
- Git
- Code editor (VS Code recommended)
- iOS development tools (macOS only): Xcode, CocoaPods
- Android development tools: Android Studio, JDK 17

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:

```bash
git clone https://github.com/YOUR_USERNAME/Ellie.git
cd Ellie
```

3. Add upstream remote:

```bash
git remote add upstream https://github.com/IlyasuSeidu/Ellie.git
```

4. Install dependencies:

```bash
npm install
```

5. Create a branch for your work:

```bash
git checkout -b feature/your-feature-name
```

## Development Workflow

### 1. Sync with Upstream

Before starting work, sync with the upstream repository:

```bash
git checkout main
git fetch upstream
git merge upstream/main
git push origin main
```

### 2. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

Branch naming conventions:

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Test additions or changes
- `chore/` - Maintenance tasks

### 3. Make Your Changes

- Write clean, readable code
- Follow the code style guide
- Add tests for new functionality
- Update documentation as needed
- Ensure all tests pass
- Run linting and type checking

### 4. Commit Your Changes

```bash
git add .
git commit -m "feat: add user profile feature"
```

See [Commit Message Format](#commit-message-format) for details.

### 5. Push to Your Fork

```bash
git push origin feature/your-feature-name
```

### 6. Create a Pull Request

- Go to GitHub and create a pull request
- Fill out the PR template completely
- Link any related issues
- Wait for review and address feedback

## Code Style Guide

### TypeScript

#### Type Definitions

**Always use explicit types for function parameters and return values:**

```typescript
// Good
function calculateTotal(price: number, quantity: number): number {
  return price * quantity;
}

// Bad
function calculateTotal(price, quantity) {
  return price * quantity;
}
```

#### Avoid `any` Type

```typescript
// Good
function processUser(user: User): void {
  // ...
}

// Bad
function processUser(user: any): void {
  // ...
}
```

#### Use Interfaces for Object Shapes

```typescript
// Good
interface UserProps {
  name: string;
  email: string;
  age?: number;
}

// Bad
type UserProps = {
  name: string;
  email: string;
  age?: number;
};
```

**Note**: Use `type` for unions, intersections, and mapped types.

### React Components

#### Functional Components with TypeScript

```typescript
import React from 'react';

interface ButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}

export function Button({ title, onPress, disabled = false }: ButtonProps) {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled}>
      <Text>{title}</Text>
    </TouchableOpacity>
  );
}
```

#### Component File Structure

```typescript
// 1. Imports
import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';

// 2. Types/Interfaces
interface Props {
  // ...
}

// 3. Component
export function Component({ }: Props) {
  // 3a. Hooks
  const [state, setState] = useState();

  // 3b. Effects
  useEffect(() => {
    // ...
  }, []);

  // 3c. Event handlers
  const handlePress = () => {
    // ...
  };

  // 3d. Render
  return (
    <View>
      <Text>Content</Text>
    </View>
  );
}

// 4. Styles (if using StyleSheet)
const styles = StyleSheet.create({
  // ...
});
```

### Naming Conventions

| Type       | Convention                                     | Example                        |
| ---------- | ---------------------------------------------- | ------------------------------ |
| Components | PascalCase                                     | `UserProfile`, `LoginButton`   |
| Functions  | camelCase                                      | `calculateTotal`, `formatDate` |
| Hooks      | camelCase with `use` prefix                    | `useAuth`, `useForm`           |
| Constants  | SCREAMING_SNAKE_CASE                           | `API_URL`, `MAX_RETRIES`       |
| Interfaces | PascalCase with `I` prefix (optional)          | `IUser` or `User`              |
| Types      | PascalCase                                     | `User`, `AuthState`            |
| Enums      | PascalCase                                     | `UserRole`, `Status`           |
| Files      | PascalCase for components, camelCase for utils | `Button.tsx`, `validation.ts`  |

### Code Formatting

We use Prettier for code formatting. Configuration:

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

Run formatting:

```bash
npm run format
```

### ESLint Rules

Key rules enforced:

- `@typescript-eslint/no-explicit-any`: Error
- `@typescript-eslint/no-unused-vars`: Error
- `react-hooks/exhaustive-deps`: Error
- `no-console`: Warn (use `console.warn` or `console.error` instead)
- `eqeqeq`: Error (always use `===`)
- `prefer-const`: Error

Run linting:

```bash
npm run lint
npm run lint:fix  # Auto-fix issues
```

### Import Organization

```typescript
// 1. React and React Native
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

// 2. Third-party libraries
import { Button } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';

// 3. Components
import Header from '@/components/common/Header';
import UserCard from '@/components/UserCard';

// 4. Hooks
import { useAuth } from '@/hooks/useAuth';
import { useUser } from '@/hooks/useUser';

// 5. Utils
import { formatDate } from '@/utils/formatters';
import { validateEmail } from '@/utils/validation';

// 6. Types
import { User } from '@/types/user';
import { AuthState } from '@/types/auth';

// 7. Constants
import { API_URL } from '@/constants/config';

// 8. Styles (if external)
import styles from './styles';
```

### Comments

#### When to Comment

- Complex algorithms or business logic
- Non-obvious workarounds
- TODO items with context
- Public API documentation

#### When NOT to Comment

- Self-explanatory code
- Redundant information
- Commented-out code (delete instead)

```typescript
// Good: Explains WHY
// Using setTimeout to avoid race condition with Firebase auth state
setTimeout(() => checkAuthStatus(), 100);

// Bad: Explains WHAT (obvious from code)
// Increment counter by 1
counter++;
```

### File Organization

```
src/
├── components/
│   ├── common/           # Generic reusable components
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.test.tsx
│   │   │   └── index.ts
│   │   └── Input/
│   │       ├── Input.tsx
│   │       └── index.ts
│   └── features/         # Feature-specific components
│       └── UserCard/
│           ├── UserCard.tsx
│           └── index.ts
├── screens/              # Screen components
├── hooks/                # Custom hooks
├── services/             # External services
├── utils/                # Utility functions
└── types/                # TypeScript types
```

## Commit Message Format

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type

Must be one of:

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only changes
- `style`: Code style changes (formatting, missing semi-colons, etc.)
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: Performance improvement
- `test`: Adding or updating tests
- `chore`: Changes to build process or auxiliary tools
- `ci`: Changes to CI configuration files and scripts
- `revert`: Reverts a previous commit

### Scope (Optional)

The scope should be the name of the affected module:

- `auth`
- `profile`
- `navigation`
- `firebase`
- `ui`

### Subject

- Use imperative, present tense: "add" not "added" nor "adds"
- Don't capitalize first letter
- No period at the end
- Maximum 72 characters

### Body (Optional)

- Explain the motivation for the change
- Contrast with previous behavior

### Footer (Optional)

- Reference issues: `Closes #123`
- Breaking changes: `BREAKING CHANGE: description`

### Examples

```bash
# Simple feature
git commit -m "feat: add user profile screen"

# Bug fix with scope
git commit -m "fix(auth): resolve login redirect issue"

# With body
git commit -m "feat(profile): add avatar upload

Allow users to upload and update their profile picture.
Uses Firebase Storage for image hosting."

# Breaking change
git commit -m "feat(api): update authentication API

BREAKING CHANGE: Auth tokens now expire after 1 hour instead of 24 hours.
Users will need to re-authenticate more frequently."

# Multiple issues
git commit -m "fix: resolve navigation bugs

Closes #123
Closes #456"
```

### Co-authored Commits

Pre-commit hooks automatically add:

```
Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

## Pull Request Process

### Before Creating a PR

1. **Sync with main branch**:

   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run all checks**:

   ```bash
   npm run validate    # Type-check + lint
   npm test            # Run tests
   npm run format      # Format code
   ```

3. **Review your changes**:
   ```bash
   git diff main
   ```

### Creating a PR

1. **Push to your fork**:

   ```bash
   git push origin feature/your-feature-name
   ```

2. **Open PR on GitHub**

3. **Fill out PR template completely**:
   - Clear description of changes
   - Link related issues
   - Add screenshots for UI changes
   - Complete the checklist

### PR Review Process

1. **Automated Checks**:
   - CI pipeline must pass
   - Code coverage must meet threshold (70%)
   - No linting errors
   - No type errors

2. **Code Review**:
   - At least one approval required
   - Address all reviewer feedback
   - Keep discussion professional and constructive

3. **Merge**:
   - Squash and merge preferred
   - Delete branch after merge

### Addressing Feedback

```bash
# Make changes based on feedback
git add .
git commit -m "fix: address review feedback"
git push origin feature/your-feature-name
```

## Testing Requirements

### Minimum Requirements

All contributions must include appropriate tests:

1. **Unit tests** for:
   - New utility functions
   - Custom hooks
   - Individual components

2. **Integration tests** for:
   - New screens
   - Complex user flows

3. **E2E tests** (if applicable) for:
   - Critical user journeys
   - New authentication flows

### Coverage Requirements

- Minimum 70% coverage for all metrics
- New code should have 80%+ coverage
- Critical paths should have 100% coverage

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- Button.test.tsx

# Run E2E tests
npm run test:e2e
```

## Documentation

### When to Update Documentation

Update documentation when you:

- Add new features
- Change existing behavior
- Add new configuration options
- Modify APIs or interfaces
- Add new dependencies

### Documentation Files

- `README.md`: Project overview and setup
- `docs/ARCHITECTURE.md`: Architecture decisions
- `docs/TESTING_STRATEGY.md`: Testing approach
- `docs/API_REFERENCE.md`: API documentation
- `docs/DEPLOYMENT.md`: Deployment instructions
- `CHANGELOG.md`: Version history

### Code Documentation

Use JSDoc for public APIs:

````typescript
/**
 * Validates an email address format
 *
 * @param email - The email address to validate
 * @returns True if email is valid, false otherwise
 *
 * @example
 * ```typescript
 * validateEmail('test@example.com') // returns true
 * validateEmail('invalid') // returns false
 * ```
 */
export function validateEmail(email: string): boolean {
  // Implementation
}
````

## Issue Reporting

### Before Creating an Issue

1. Search existing issues
2. Check if it's already fixed in `main`
3. Gather relevant information

### Issue Template

**Bug Report**:

- Clear title
- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment (OS, device, versions)
- Screenshots or videos

**Feature Request**:

- Clear description
- Use case
- Proposed solution
- Alternatives considered

## Development Tools

### Recommended VS Code Extensions

- ESLint
- Prettier
- TypeScript
- React Native Tools
- GitLens
- EditorConfig

### VS Code Settings

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

## Getting Help

- Read the [Architecture documentation](./ARCHITECTURE.md)
- Check [Testing Strategy](./TESTING_STRATEGY.md)
- Review [API Reference](./API_REFERENCE.md)
- Ask questions in issues or discussions

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.

## Questions?

Feel free to reach out:

- Open an issue for discussion
- Tag maintainers in PR comments
- Check existing documentation

Thank you for contributing to Ellie!

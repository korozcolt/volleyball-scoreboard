# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is a **Professional Volleyball Scoreboard System** designed for live streaming with OBS Studio. It's a Vue 3 + TypeScript application with two main components:
- **Controller Panel**: Admin interface for controlling the match
- **Overlay View**: Clean professional display for OBS streaming

## Development Commands

### Essential Commands
```bash
# Install dependencies
npm install

# Start development server (default port 3000)
npm run dev

# Run both controller and overlay simultaneously
npm run dev:dual  # Controller on :3000, Overlay on :3001

# Individual views
npm run controller  # Opens controller on port 3000
npm run overlay     # Opens overlay on port 3001

# Build for production
npm run build

# Preview production build
npm run preview
```

### Code Quality Commands
```bash
# Run all linters (ESLint + Oxlint)
npm run lint

# Individual linters
npm run lint:eslint  # Run ESLint with fixes
npm run lint:oxlint  # Run Oxlint for correctness

# Format code with Prettier
npm run format

# Type checking
npm run type-check

# Clean build artifacts
npm run clean
```

### Testing
Currently, no test framework is configured. Testing implementation is planned (0% progress).

## Architecture Overview

### State Management
The application uses **Pinia** for centralized state management with a single main store (`scoreboard.ts`) that handles:
- Game state (scores, sets, rotations)
- Team configurations
- Match history
- Real-time events

### Real-Time Communication System
Communication between Controller and Overlay uses a multi-channel approach:
1. **LocalStorage**: Primary method for cross-tab communication
2. **Custom Events**: For same-tab updates
3. **BroadcastChannel API**: Modern browser communication (when available)

The system automatically handles:
- Debounced updates (100ms delay)
- Storage quota management
- Fallback mechanisms
- Connection status monitoring

### Routing Structure
- `/` - Home page with navigation
- `/controller` - Match control panel
- `/overlay` - OBS streaming overlay
- `/settings` - System configuration (pending)

### Key Composables
- `useCommunication()`: Handles real-time sync between views
- `useGameState()`: Game logic and state management
- `useSettings()`: Persistent configuration management

## Important Configuration

### Keyboard Shortcuts (defined but not yet implemented)
- `Q/W` - Add point to Local/Visitor
- `A/S` - Remove point from Local/Visitor
- `Z/X` - Rotate Local/Visitor team
- `N` - Next set
- `Ctrl+R` - Reset game
- `Space` - Toggle serve

### OBS Integration
Recommended overlay settings:
- Resolution: 1920x200px
- URL: `http://localhost:3000/overlay`
- Background: Transparent
- Add as "Browser Source" in OBS

### Game Rules (Configurable)
- Max sets: 5 (best of 5)
- Points per set: 25 (15 in deciding set)
- Minimum advantage: 2 points
- Automatic rotation: 6 players

## Project Status
Current progress: **40% complete**
- ✅ Project setup and configuration
- ✅ Pinia store with complete volleyball logic
- ✅ Real-time communication system
- ✅ Base styles with Tailwind CSS
- 🔄 Controller components (20%)
- 🔄 Overlay components (20%)
- ❌ Testing implementation (0%)

## Code Structure Patterns

### Component Organization
```
components/
├── controller/   # Controller-specific components
├── overlay/      # Overlay-specific components
└── common/       # Shared reusable components
```

### Type Definitions
All TypeScript types are centralized in `src/types/game.types.ts`

### Constants Management
Application constants are organized in `src/utils/constants.ts`:
- Game settings
- Storage keys
- Routes
- Keyboard shortcuts
- Validation rules
- Animation configs

### Path Aliases
Available import aliases configured in Vite:
- `@/` - src directory
- `@components` - src/components
- `@composables` - src/composables
- `@stores` - src/stores
- `@types` - src/types
- `@utils` - src/utils

## Development Tips

### Working with the Store
The scoreboard store uses Vue 3 Composition API pattern with Pinia. Key methods:
- `scorePoint(team)` - Add point with automatic rotation logic
- `removePoint(team)` - Remove point with history tracking
- `nextSet()` - Advance to next set
- `resetGame()` - Full game reset

### Event System
The application emits typed events for all game actions:
- `score_point`
- `set_finished`
- `game_finished`
- `rotation`
- `serve_change`

### Debugging
In development mode, global helpers are available in console:
```javascript
volleyball.router          // Access router
volleyball.navigateTo      // Navigation helpers
volleyball.openController() // Open controller in new window
volleyball.openOverlay()    // Open overlay in new window
```

## Current Focus Areas

### Immediate Tasks
1. Complete ControllerView implementation
2. Complete OverlayView implementation
3. Create reusable components (TeamLogo, ServeIndicator, etc.)
4. Integrate keyboard shortcuts
5. Add error handling and validation

### Known Issues
- Test framework not configured
- Some components are scaffolded but not fully implemented
- Settings view is pending implementation

## Dependencies

### Core Technologies
- **Vue 3.5.18** with Composition API
- **TypeScript 5.8** for type safety
- **Vite** (using rolldown-vite) for build
- **Pinia** for state management
- **Vue Router 4** for navigation
- **Tailwind CSS 3** for styling

### Development Tools
- **ESLint 9** + **Oxlint** for linting
- **Prettier 3.6** for formatting
- **Vue DevTools** for debugging
- **PostCSS** + **Autoprefixer** for CSS processing

## Build System
The project uses Vite with special configuration:
- Using `rolldown-vite` (latest) instead of standard Vite
- Vue JSX support enabled
- TypeScript configured with separate configs for app and node
- Host mode enabled for network access during development

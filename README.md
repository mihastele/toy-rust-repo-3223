# DataGrip Alternative

A cross-platform database management system built with Tauri + React. This is an open-source alternative to JetBrains DataGrip.

## Features

### Core (MVP)
- Multi-database support (SQLite, PostgreSQL, MySQL, MariaDB)
- SQL query editor with syntax highlighting
- Connection management
- Schema browser
- Results table with pagination
- Query execution

### Standard (Planned)
- Export data to CSV, JSON, SQL
- Query history and favorites
- ER diagram visualization
- Table data editor
- Index management

### Professional (Planned)
- Query optimization suggestions
- Plugin system
- Cloud database support (Snowflake, BigQuery, etc.)
- SSH tunneling
- Advanced security features

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Desktop Framework**: Tauri 2.0
- **State Management**: Zustand
- **Backend**: Rust
- **Database Drivers**: SQLx (PostgreSQL, MySQL, SQLite), MongoDB, Redis

## Project Structure

```
datagrip-alternative/
├── src/
│   ├── components/          # React components
│   │   ├── Sidebar.tsx      # Database connection sidebar
│   │   ├── Toolbar.tsx      # Main toolbar
│   │   ├── QueryEditor.tsx  # SQL query editor
│   │   ├── ResultsTable.tsx # Query results display
│   │   ├── SchemaBrowser.tsx # Database schema explorer
│   │   └── ConnectionDialog.tsx # Connection management
│   ├── stores/              # Zustand state stores
│   │   ├── connectionStore.ts
│   │   └── queryStore.ts
│   ├── types/               # TypeScript type definitions
│   ├── utils/               # Utility functions
│   ├── drivers/             # Database driver wrappers
│   └── styles/              # Global CSS styles
├── src-tauri/
│   ├── src/
│   │   ├── main.rs          # Tauri entry point
│   │   └── database.rs      # Database connection handling
│   ├── Cargo.toml           # Rust dependencies
│   └── tauri.conf.json      # Tauri configuration
├── package.json
├── tsconfig.json
├── vite.config.ts
└── index.html
```

## Getting Started

### Prerequisites

- Node.js 18+
- Rust 1.70+
- Cargo

### Installation

```bash
# Install dependencies
npm install

# Build Tauri backend
cd src-tauri && cargo build --release

# Run development server
npm run dev

# Build for production
npm run build
```

### Database Support

| Database | Status | Notes |
|----------|--------|-------|
| SQLite | ✅ Ready | Uses rusqlite |
| PostgreSQL | ✅ Ready | Uses sqlx |
| MySQL | ✅ Ready | Uses sqlx |
| MariaDB | ✅ Ready | Uses sqlx |
| MongoDB | 🔄 Planned | Uses mongodb crate |
| Redis | 🔄 Planned | Uses redis crate |
| Oracle | 📋 Future | |
| SQL Server | 📋 Future | |
| Snowflake | 📋 Future | |
| BigQuery | 📋 Future | |

## Usage

1. **Add a Connection**: Click the + button in the sidebar
2. **Connect**: Click the play button next to a connection
3. **Write Queries**: Use the SQL editor (Ctrl+Enter to execute)
4. **View Results**: Results appear in the table below
5. **Browse Schema**: Expand connections to see tables and columns

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+Enter | Execute query |
| Tab | Insert spaces |
| Ctrl+S | Save query |

## Contributing

As a solo developer project, contributions are welcome:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - feel free to use this for personal or commercial projects.

## Acknowledgments

- [Tauri](https://tauri.app/) - Build smaller, faster, and more secure desktop applications
- [JetBrains DataGrip](https://www.jetbrains.com/datagrip/) - Inspiration for features and UI
- [SQLx](https://github.com/launchbadge/sqlx) - Async SQL runtime
# toy-rust-repo-3223

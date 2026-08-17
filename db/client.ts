import * as SQLite from 'expo-sqlite';

// Single shared database connection for the entire app
const db = SQLite.openDatabaseSync('media-centre.db');

export default db;

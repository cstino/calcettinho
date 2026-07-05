// Side-effect CSS imports (e.g. `import './Component.css'`) are handled natively
// by Next.js at build time, but the TS language server needs a module declaration
// to stop flagging them as missing types.
declare module '*.css';

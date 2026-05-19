const fs = require('fs');
let code = fs.readFileSync('components/AdminFooter.tsx', 'utf8');

code = code.replace(
  "import { triggerManualScan } from '@/app/actions';",
  "import { triggerManualScan, retryFailedDrafts } from '@/app/actions';"
);

code = code.replace(
  "const [scanning, setScanning] = useState(false);",
  "const [scanning, setScanning] = useState(false);\n  const [retrying, setRetrying] = useState(false);"
);

const retryLogic = `
  const handleRetry = async () => {
    if (retrying || scanning) return;
    setRetrying(true);
    try {
      const res = await retryFailedDrafts();
      alert(\`Retry complete: \${res.success} of \${res.attempted} successful.\`);
      window.location.reload();
    } catch (err) {
      console.error("Retry failed", err);
      alert("Retry failed. Check console for details.");
      setRetrying(false);
    }
  };
`;
code = code.replace("const handleScan = async () => {", retryLogic + "\n  const handleScan = async () => {");

const buttonStyles = `
            background: 'transparent',
            border: 'none',
            color: 'var(--text-tertiary)',
            textDecoration: 'underline',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: 'inherit',
            textTransform: 'inherit',
            letterSpacing: 'inherit',
            transition: 'color 200ms ease',
            marginRight: '12px'
`;

const buttonsHTML = `
        <button 
          onClick={handleRetry} 
          disabled={retrying || scanning}
          style={{${buttonStyles}}}
          onMouseOver={(e) => !(retrying || scanning) && (e.currentTarget.style.color = 'var(--text)')}
          onMouseOut={(e) => !(retrying || scanning) && (e.currentTarget.style.color = 'var(--text-tertiary)')}
        >
          {retrying ? 'Retrying...' : 'Retry failed drafts'}
        </button>
        <button 
          onClick={handleScan} 
          disabled={scanning || retrying}
          style={{${buttonStyles.replace("marginRight: '12px'", "")}}}
          onMouseOver={(e) => !(scanning || retrying) && (e.currentTarget.style.color = 'var(--beam)')}
          onMouseOut={(e) => !(scanning || retrying) && (e.currentTarget.style.color = 'var(--text-tertiary)')}
        >
          {scanning ? 'Scanning…' : 'Run scan now'}
        </button>
`;

code = code.replace(/<button[\s\S]*?<\/button>/, buttonsHTML);

fs.writeFileSync('components/AdminFooter.tsx', code);
console.log('AdminFooter.tsx updated');

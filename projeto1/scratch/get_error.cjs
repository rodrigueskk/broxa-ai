const { spawn } = require('child_process');
const esbuild = spawn('npx', ['esbuild', 'src/pages/ChatPage.tsx', '--loader=tsx'], { shell: true });

esbuild.stdout.on('data', (data) => {
    // console.log(`stdout: ${data}`);
});

esbuild.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
});

esbuild.on('close', (code) => {
    console.log(`child process exited with code ${code}`);
});

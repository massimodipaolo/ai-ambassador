#!/usr/bin/env node

/* eslint-disable @typescript-eslint/no-var-requires */
const bomEnv = require('@websolutespa/bom-env');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

function checkForActivation() {

  bomEnv().then(() => {

    const isWin = process.platform === 'win32';
    const python = process.env.PYTHON || 'python3';

    /*
    console.log('checkForActivation.python', python);
    console.log('checkForActivation.__dirname', __dirname);
    console.log('checkForActivation.cwd', cwd);
    */

    try {

      const cwd = process.cwd();
      const lib = 'lib';
      const venv = 'venv';
      const sourceLibFolder = path.join(__dirname, '../lib');
      const llmFolder = path.join(cwd, lib);
      const llmEnvFolder = path.join(cwd, venv);
      // console.log(__dirname);
      // console.log('checkForActivation', __dirname, cwd);

      const doDeactivate = () => {
        // console.log('doDeactivate');
        if (!isWin) {
          process.exit(0);
        }
        const command = path.join(llmEnvFolder, 'Scripts', 'deactivate');
        console.log('doDeactivate.command', command);
        const p = spawn('cmd', ['/c', command],
          {
            cwd: cwd,
          });
        p.stderr.on('data', (data) => {
          const message = data.toString();
          console.error('doDeactivate.stderr', message);
        });
        p.stdout.on('data', function(data) {
          const message = data.toString();
          console.log('doDeactivate.stdout', message);
        });
        p.on('close', function(status) {
          console.log('doDeactivate.close', status);
          if (status !== 0) {
            return;
          }
          process.exit(0);
        });
      };

      const doActivate = () => {
        // console.log('doActivate');
        if (isWin) {
          const command = path.join(llmEnvFolder, 'Scripts', 'activate');
          console.log('doActivate.command', command);
          const p = spawn('cmd', ['/k', command],
            {
              cwd: cwd,
            });
          p.stderr.on('data', (data) => {
            const message = data.toString();
            console.error('doActivate.stderr', message);
            doDeactivate();
          });
          let first = true;
          p.stdout.on('data', (data) => {
            const message = data.toString();
            console.error('doActivate.stdout', message);
            if (first) {
              first = false;
              p.stdin.write(`pip3 install --upgrade -r ${path.join(llmFolder, 'requirements.txt')}\n`);
            } else if (message.indexOf('Successfully installed') !== -1) {
              doDeactivate();
            }
          });
        } else {
          const command = path.join(llmEnvFolder, 'bin', 'activate');
          console.log('doActivate.command', command);
          const p = spawn('bash', ['-s'], {
            cwd: cwd,
          });
          p.stderr.on('data', (data) => {
            const message = data.toString();
            console.error('doActivate.stderr', message);
            doDeactivate();
          });
          p.stdout.on('data', (data) => {
            const message = data.toString();
            console.error('doActivate.stdout', message);
            if (
              message.indexOf('Successfully installed pip') !== -1 ||
              message.indexOf('Requirement already satisfied: pip in') !== -1
            ) {
              p.stdin.write(`pip install -r ${path.join(llmFolder, 'requirements.txt')}\n`);
            } else if (message.indexOf('Successfully installed') !== -1) {
              doDeactivate();
            }
          });
          p.stdin.write(`source ${path.join(llmEnvFolder, 'bin', 'activate')}\n`);
          p.stdin.write('pip install --upgrade pip\n');
        }
      };

      const doVirtualEnv = () => {
        // console.log('doVirtualEnv');
        const p = spawn(python, ['-m', 'venv', venv], {
          cwd: cwd,
        });

        p.stderr.on('data', (data) => {
          const message = data.toString();
          console.error('doVirtualEnv.stderr', message);
        });

        p.stdout.on('data', (data) => {
          const message = data.toString();
          // console.log('doVirtualEnv.stdout', message);
        });

        p.on('close', function(status) {
          console.log('doVirtualEnv.close', status);
          if (status !== 0) {
            return;
          }
          doActivate();
        });
      };

      fs.cpSync(sourceLibFolder, llmFolder, {
        recursive: true,
        force: true,
      });

      if (!fs.existsSync(llmEnvFolder)) {
        doVirtualEnv();
      } else {
        doDeactivate();
      }

    } catch (error) {
      console.error('checkForActivation.error', error);
    }
  });

}

/*
const params = process.argv.slice(2);
console.log('params', ...params);
checkForActivation(...params);
*/

checkForActivation();

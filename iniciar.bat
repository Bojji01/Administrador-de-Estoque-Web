@echo off
REM Script para iniciar o servidor de controle de estoque

cd backend

REM Verificar se node_modules existe
if not exist node_modules (
    echo Instalando dependencias...
    call npm install
)

echo.
echo ====================================
echo Iniciando servidor...
echo ====================================
echo.
echo Acesse: http://localhost:3000
echo.
echo Para parar o servidor, pressione Ctrl+C
echo.

npm start

pause

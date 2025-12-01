@echo off
chcp 65001 >nul
title GLB Compressor for 3DVista

:: ================== KIỂM TRA THAM SỐ ==================
if "%~1"=="" (
    echo Su dung:
    echo   %~nx0 "duong_dan\file.glb"
    echo   %~nx0 "duong_dan\thu_muc_chua_glb"
    exit /b
)

set "target=%~1"

if not exist "%target%" (
    echo Duong dan "%target%" khong ton tai!
    exit /b
)

:: ================== HỎI THAM SỐ CHUNG ==================
:: Nhap muc quality cho texture
set /p quality="Nhap muc quality cho texture (70-85, 80 la mac dinh): "
if "%quality%"=="" set quality=80

:: Nhap muc compress mesh (0.1 - 1.0, 1.0 = giu full mesh, 0.5 = giam 50%%)
set /p mesh_percent="Nhap muc compress mesh (0.1 - 1.0, 0.5 la mac dinh): "
if "%mesh_percent%"=="" set mesh_percent=0.5

echo.
echo Su dung:
echo   - Texture quality = %quality%
echo   - Mesh simplify   = %mesh_percent%
echo.

:: ================== PHÂN BIỆT FILE vs FOLDER ==================
:: Neu target la file .glb -> xu ly 1 file
if /I "%~x1"==".glb" (
    call :PROCESS_ONE "%target%"
    echo.
    echo Hoan thanh 1 file.
    exit /b
)

:: Neu target la folder -> xu ly tat ca *.glb trong folder do
pushd "%target%"
echo Dang xu ly tat ca file .glb trong thu muc: %cd%
echo.

for %%F in (*.glb) do (
    call :PROCESS_ONE "%%F"
)

popd

echo.
echo Hoan thanh tat ca file trong thu muc.
exit /b

:: ================== HÀM XỬ LÝ 1 FILE ==================
:PROCESS_ONE
set "input=%~1"
set "name=%~n1"
set OUTDIR=output
if not exist "%OUTDIR%" mkdir "%OUTDIR%"

echo ------------------------------------------
echo Xu ly file: %input%
echo ------------------------------------------

if not exist "%input%" (
    echo   File "%input%" khong ton tai, bo qua.
    echo.
    goto :eof
)

:: Step 1: Optimize
echo   Step 1: Optimize structure...
call gltf-transform optimize "%input%" "%name%_opt.glb" --no-compress
if errorlevel 1 (
    echo   Loi: gltf-transform optimize bi loi, bo qua file nay.
    echo.
    goto :eof
)
echo   Step 1 done!

:: Step 2: Compress mesh
echo   Step 2: Compress mesh (si=%mesh_percent%)...
call gltfpack -i "%name%_opt.glb" -o "%name%_mesh.glb" -cc -si %mesh_percent%
if errorlevel 1 (
    echo   Loi: gltfpack bi loi, bo qua file nay.
    echo.
    goto :eof
)
echo   Step 2 done!

:: Step 3: Compress textures
echo   Step 3: Compress textures (quality=%quality%)...
call gltf-transform webp "%name%_mesh.glb" "%name%_webp.glb" --quality %quality%
if errorlevel 1 (
    echo   Loi: gltf-transform webp bi loi, bo qua file nay.
    echo.
    goto :eof
)
echo   Step 3 done!

:: Step 4: Prune
echo   Step 4: Clean up (prune)...
call gltf-transform prune "%name%_webp.glb" "%OUTDIR%\%name%_final.glb"
if errorlevel 1 (
    echo   Loi: gltf-transform prune bi loi, bo qua file nay.
    echo.
    goto :eof
)
echo   Step 4 done!

:: ======== XÓA FILE TẠM =========
del "%name%_opt.glb"
del "%name%_mesh.glb"
del "%name%_webp.glb"
:: ================================


echo   Done! Output file: %OUTDIR%\%name%_final.glb
echo.
goto :eof

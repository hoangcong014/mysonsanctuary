chcp 65001 >nul
@echo off
setlocal enabledelayedexpansion

echo ======================================
echo    JPG → WEBP CONVERTER (CMD MODE)
echo ======================================
echo.

REM --- Kiểm tra tham số đầu vào ---
if "%~1"=="" (
    echo ❌ Lỗi: Bạn phải truyền đường dẫn folder chứa ảnh.
    echo Ví dụ:
    echo     convert_to_webp.bat "D:\Images"
    pause
    exit /b
)

set "INPUT_FOLDER=%~1"

REM --- Nhập chất lượng WebP ---
set /p QUALITY=Nhập chất lượng WebP (0-100, đề xuất 70-85): 
if "%QUALITY%"=="" set QUALITY=75

REM --- Nhập chiều rộng tối đa ---
set /p MAXWIDTH=Nhập chiều rộng tối đa (px), ví dụ 1600: 
if "%MAXWIDTH%"=="" set MAXWIDTH=1600

REM --- Nhập thư mục đầu ra ---
echo.
set /p OUTPUT_FOLDER=Nhập thư mục đầu ra (Enter để lưu cạnh file gốc): 

REM Nếu không nhập OUTPUT_FOLDER → để trống
if "%OUTPUT_FOLDER%"=="" (
    set OUTPUT_MODE=INLINE
    echo ➜ Ảnh sẽ được lưu cạnh file gốc
) else (
    set OUTPUT_MODE=SEPARATE
    echo ➜ Ảnh sẽ được lưu vào: %OUTPUT_FOLDER%
)

echo.
echo ------------- THÔNG SỐ -------------
echo Input Folder   = %INPUT_FOLDER%
echo Output Mode    = %OUTPUT_MODE%
echo Quality        = %QUALITY%
echo MaxWidth       = %MAXWIDTH%
echo ------------------------------------
echo.
pause

REM Nếu có OUTPUT_FOLDER thì tạo thư mục
if "%OUTPUT_MODE%"=="SEPARATE" (
    if not exist "%OUTPUT_FOLDER%" mkdir "%OUTPUT_FOLDER%"
)

echo.
echo === BẮT ĐẦU XỬ LÝ ẢNH ===
echo.

REM Lặp qua toàn bộ ảnh JPG / JPEG trong thư mục gốc + subfolder
for /r "%INPUT_FOLDER%" %%f in (*.jpg *.jpeg *.JPG *.JPEG) do (

    echo Đang xử lý: %%f

    if "%OUTPUT_MODE%"=="INLINE" (
        REM Lưu cạnh file gốc
        set "outfile=%%~dpnf.webp"
    ) else (
        REM Lưu vào output folder, giữ cấu trúc thư mục con
        set "relpath=%%f"
        set "relpath=!relpath:%INPUT_FOLDER%=!"
        set "relpath=!relpath:~1!"
        
        set "outpath=%OUTPUT_FOLDER%!relpath!"
        set "outfolder=%%~dpF.out"
        
        REM Tạo thư mục nếu chưa có
        for %%d in ("!outpath!") do (
            if not exist "%%~dpd" mkdir "%%~dpd"
        )

        REM Tạo đường dẫn tên file .webp
        for %%d in ("!outpath!") do set "outfile=%%~dpnd.webp"
    )

    REM Resize + convert
    magick "%%f" -auto-orient -resize %MAXWIDTH%x -quality %QUALITY% "!outfile!"
)

echo.
echo ==========================
echo      HOÀN THÀNH
echo ==========================
echo.
pause

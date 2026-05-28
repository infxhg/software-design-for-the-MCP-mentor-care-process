# Frontend Startup Guide

This guide explains how to install dependencies, build, and run the frontend of the project.

## 1. Open the Project Directory

First, open PowerShell or a terminal and enter the frontend directory:

```bash  
cd B09-main  
cd B09_MCPProject  
cd Frontend-v8  
```

Or directly:

```bash  
cd B09-main/B09_MCPProject/Frontend-v8  
```

## 2. Install Dependencies

Run the following command to install all required frontend dependencies:

```bash  
npm install  
```

If you are using Windows PowerShell, you can also run:

```bash  
npm.cmd install  
```

## 3. Start the Frontend Development Server

Run:

```bash  
npm run dev  
```

Or on Windows PowerShell:

```bash  
npm.cmd run dev  
```

After the server starts successfully, you should see output similar to:

```text  
VITE v7.x.x ready in xxx ms  

➜  Local:   http://localhost:5173/  
```

## 4. Open the Frontend in Browser

Open your browser and visit:

```text  
http://localhost:5173/  
```

The frontend application should now be running.

## 5. Optional: Build for Production

If you want to build the frontend for production, run:

```bash  
npm run build  
```

Or on Windows PowerShell:

```bash  
npm.cmd run build  
```

The production files will be generated in the `dist` folder.

## Notes

- Make sure **Node.js** and **npm** are installed before running the frontend.
- Recommended Node.js version: **Node.js 18 or later**.
- If the port `5173` is already in use, Vite may use another available port. Check the terminal output for the actual frontend URL.
- Keep the terminal running while using the frontend in development mode.
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

function checkEnv() {
    dotenv.config(); // load .env
    console.log("==================================================");
    console.log("GEMINI ENVIRONMENT VERIFICATION");
    console.log("==================================================");
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
        console.log("GEMINI_API_KEY: NOT FOUND or EMPTY");
    } else {
        console.log("GEMINI_API_KEY: FOUND");
        console.log(`Length: ${key.length}`);
        console.log(`Starts with whitespace? ${/^\s/.test(key)}`);
        console.log(`Ends with whitespace? ${/\s$/.test(key)}`);
    }
}

checkEnv();

import { utimesSync, createReadStream, createWriteStream, existsSync, statSync } from "fs";
import { pipeline } from "stream/promises";
import { unlink, mkdir } from 'fs/promises';
import { resolve, basename, dirname, extname, sep as pathSeparator  } from 'path';
import { createInflate } from "zlib";
import { DecryptStream } from "./decrypt-stream.mjs";
import { parseDate} from './helpers.mjs';
import { TimestampExtractStream } from "./timestamp-extract-stream.mjs";

export const decryptFile = async (inputFile, password, printProgressCallBack, updateProgressCallBack, {flagDelete, flagOverwrite, flagMove}) => {
  const inputFileStats = statSync(inputFile);
  const inputFileTotalBytes = inputFileStats.size - 16;
  const inputFileAbsolutePath = resolve(inputFile);
  const inputBaseFileName = basename(inputFileAbsolutePath);
  const inputFileNameExtension = extname(inputFileAbsolutePath).slice(1);
  const inputFileParts = inputBaseFileName.split(".");

  const originalFileNameWithExtension= inputFileParts.slice(0, inputFileParts.length - 1).join(".");


  const outputDir = dirname(inputFileAbsolutePath);
  let middlePaths = [];

  if (flagMove) {
    outputDir = resolve(flagMove);

    const inputFilePaths = inputFileAbsolutePath.split(pathSeparator);
    const outputDirPaths = outputDir.split(pathSeparator);

    middlePaths = inputFilePaths
      .slice(0, -1)
      .filter((pathValue, pathIndex) => outputDirPaths.at(pathIndex) !== pathValue)
      .map(pathValue => pathValue.replace(":", ""));
  }
  
  const outputFileName = resolve(outputDir, ...middlePaths, originalFileNameWithExtension);

  if (existsSync(outputFileName) && flagOverwrite === false) {
    console.error(`Error: The output file ${outputFileName} already exists`);
    process.exit(1);
  }
  
  const thisFileProgressCallBack = (...args) => {
    updateProgressCallBack(inputBaseFileName, ...args);
  }

  const inputStream = createReadStream(inputFileAbsolutePath);
  const createdDateStream = new TimestampExtractStream();
  const modifiedDateStream = new TimestampExtractStream();
  const decryptStream = new DecryptStream({ password, inputFileTotalBytes, progressCallBack: thisFileProgressCallBack });
  const decompressStream = createInflate();
  
  const outputBaseDirectory = dirname(outputFileName);
  await mkdir(outputBaseDirectory, { recursive: true });
  const outputStream = createWriteStream(outputFileName);

  printProgressCallBack(`\n\nDecrypting file: ${inputBaseFileName}.${inputFileNameExtension}`);
  
  await pipeline(inputStream, decryptStream, decompressStream, modifiedDateStream, createdDateStream, outputStream);

  const createdDate = createdDateStream.date;
  const modifiedDate = modifiedDateStream.date;

  if (createdDate) {
    utimesSync(outputFileName, createdDate, modifiedDate);
  } else if (modifiedDate) {
    utimesSync(outputFileName, modifiedDate, modifiedDate);
  }

  if (flagDelete) {
    await unlink(inputFile)
  }
};

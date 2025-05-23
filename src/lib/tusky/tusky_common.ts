import dotenv from 'dotenv'
import { Tusky } from '@tusky-io/ts-sdk';
import { DEFAULT_CONFIG } from '../utils/blobUtil';
import { File as TaskyFile } from "@tusky-io/ts-sdk";
import { FileData } from '../utils/types'
import { create } from 'domain';
const VALID_TIME= 1000 * 120 //1MINUTE
dotenv.config();

export function getImageUrlByFileData(siteUrl:string,fileData:FileData){
  console.log('getImageUrlByFileData blob id type',typeof fileData.blob_id , `|${fileData.blob_id}|`)
  
  if(fileData.blob_id && fileData.blob_id != 'unknown' && fileData.blob_id.length > 10){
    const now = new Date().getUTCMilliseconds();
    console.log('getImageUrlByFileData timestampMs');
    if(!fileData.timestampMs || Number(fileData.timestampMs) + VALID_TIME < now){
      return `${DEFAULT_CONFIG.initialAggregatorUrl}/v1/blobs/${encodeURIComponent(fileData.blob_id)}`
    }
  }
  const url = `${siteUrl}/image/${fileData.file_id}`;
  console.log('getImageUrlByFileData url=',url);
  return url
}


export function isBlobValid(file : TaskyFile){
  if(file.blobId || file.blobId == 'unknown'){
    return false
  }
  const now = new Date().getMilliseconds();
  console.log('isBlobValid blobId,creaedAt, now', file.blobId, file.createdAt, now)
  
  const createTime = new Date(file.createdAt).getMilliseconds();
  if(createTime + VALID_TIME < now){
    return true;
  }
  return false;
}

export function getVaultName(address : string) : string{
   let max = Math.max(address.length,34) // 32 * 4 =128
   return address.startsWith('0x') ? address.slice(2,max) : address
}



export function getTuskySiteUrl(siteUrl:string,file : TaskyFile){
    if(isBlobValid(file)){
        return `${siteUrl}/image/${file.id}`
    }else
    {
          // 定义请求的 URL
        const targetUrl =  `${DEFAULT_CONFIG.initialAggregatorUrl}/v1/blobs/${encodeURIComponent(file.blobId)}`
        return targetUrl;
   } 
}
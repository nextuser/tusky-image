import { Paginated, Tusky } from "@tusky-io/ts-sdk";
import { DEFAULT_CONFIG } from "../utils/blobUtil";
import { FileInfo } from "../utils/types";
import { getContentTypeByMimetype, getExtTypeByContentType } from "../utils/content";
import { getSiteUrl } from "../utils";
import { File as TuskyFile } from '@tusky-io/ts-sdk';
import { getSigner } from "../utils/tests/local_key";
import dotenv from 'dotenv'
import { FileData } from "../utils/types";
import { isBlobValid } from "./tusky_common";

function initTuskyByApiKey()
{
    dotenv.config();
    const apiKey = process.env.TUSKY_API_KEY
    
    if(!apiKey){
        console.error('export TUSKY_API_KEY=  first');
        console.log('env:',process.env);
        process.exit(-1)
    }

    return new Tusky({ apiKey});
}

function initTuskyBySigner(){
    const _tusky = new Tusky({wallet: {keypair: getSigner()}})
    _tusky.auth.signIn();
    return _tusky
}

let  _tusky  : Tusky = initTuskyByApiKey();
export function getServerTusky(){
    // if(!_tusky){
    //     _tusky = initTuskyBySigner();
    // }
    return _tusky;
}
export function getBlobUrl(blobId : string){
    return   `${DEFAULT_CONFIG.initialAggregatorUrl}/v1/blobs/${encodeURIComponent(blobId)}`
}

export async function  getImageTypeUrl(request : Request,fileInfo:FileInfo):Promise<[string,string]> {
   let blob_id :string | undefined = fileInfo.blob_id;
   const ext = getExtTypeByContentType(fileInfo.content_type) 
   if(!blob_id){
        let file = await getServerTusky().file.get(fileInfo.file_id)
        if(isBlobValid(file)){
            blob_id = file.blobId;
            file.blobId = file.blobId
        }
   }
   if(blob_id){
        const aggregatorUrl = DEFAULT_CONFIG.initialAggregatorUrl;
          // 定义请求的 URL
        const targetUrl =  `${aggregatorUrl}/v1/blobs/${encodeURIComponent(blob_id)}`
        return [ext,targetUrl];
   } else{
        return [ext,`${getSiteUrl(request)}/image/${fileInfo.file_id}`]
   }
}

export function getTuskyUrl(request : Request,file : TuskyFile){
    if(file.blobId){
        const aggregatorUrl = DEFAULT_CONFIG.initialAggregatorUrl;
          // 定义请求的 URL
        const targetUrl =  `${aggregatorUrl}/v1/blobs/${encodeURIComponent(file.blobId)}`
        return targetUrl;
   } else{
        return `${getSiteUrl(request)}/image/${file.file_id}`
   }
}

export async function getTuskyFile(file_id : string) 
                                : Promise<TuskyFile>{
    
    return  getServerTusky().file.get(file_id)
}

function ConvertTuskyFileToFileData(file : TuskyFile) : FileData{
    let fileData :FileData = {
        vault_id : file.vaultId,
        file_id : file.id,
        mime_type : getContentTypeByMimetype(file.mimeType),
        size : file.size,
        blob_id  : file.blobId,
        timestampMs : String(new Date(file.createdAt).getMilliseconds())
    }
    return fileData
}

export async function getTuskyFilesFor(vaultId:string,nextToken? :string) :Promise<Paginated<FileData>>{
    if(!nextToken) nextToken = undefined
    console.log(`getTuskyFilesFor vaultId ${vaultId}, nextToken ${nextToken}`);
    
    const files =await  getServerTusky().file.list({shouldDecrypt : false, vaultId: vaultId,status:'active',nextToken})
    const result : Paginated<FileData> =  {
        items: [],
        nextToken: '',
        errors: []
    }
    console.log('getTuskyFilesFor length,next', files.items.length, files.nextToken);
    for( let f of files.items){
        result.items.push(ConvertTuskyFileToFileData(f));
    }
    result.nextToken = files.nextToken
    result.errors = files.errors;

    return result;
}
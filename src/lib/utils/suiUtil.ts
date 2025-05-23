import { PaginatedEvents, SuiClient,EventId } from "@mysten/sui/client";
import { SuiTransactionBlockResponse ,    DryRunTransactionBlockResponse} from '@mysten/sui/client'
import { FileInfo, UploadStatus ,WalrusInfo} from "./types";
import { Transaction,TransactionArgument ,TransactionObjectArgument} from "@mysten/sui/transactions";
import config from '@/config/config.json'
import { fromBase64, toBase64,fromBase58, toHex } from "@mysten/sui/utils";
import * as parser from "./suiParser";
import { GasCostSummary } from "@mysten/sui/client";
import { ContentType } from "./content";
import * as sp from "./suiParser";
import { bcs } from "@mysten/bcs";

import { u256_to_blobId,u256_to_hash,
         hash_to_u256,blobId_to_u256 
        } from "@/lib/utils/convert";
import { Keypair } from "@mysten/sui/cryptography";
import { FileBlobAddResult,Profile,
        DynamicField,Struct,Address } from "./suiTypes";
/**
 * 
entry fun add_file(storage : &mut Storage,
                    owner : address,
                    file_id :String,
                    mime_type : u8,
                    size : u32,
                    ctx : & mut TxContext)
 */

export  function getAddFileTx(owner :string,file_id : string,mime_type : number, size :number){
    console.log(`file_blob::add_file( storage, owner: ${owner}, file:${file_id})`);
    const tx = new Transaction();
    tx.moveCall({
        target:`${config.pkg}::file_blob::add_file`,
        arguments:[tx.object(config.storage),
            tx.pure.address(owner),
            tx.pure.string(file_id),
            tx.pure.u8(mime_type),
            tx.pure.u32(size)
        ]
       
    });
    tx.setGasBudget(1e8);
    return tx;
} 

export function getRechargeTx(owner : string,amount_mist : number ){
    const tx = new Transaction();
    console.log(`file_blob::recharge(${config.storage}, ${owner}`)
    let new_coin = tx.splitCoins(tx.gas,[amount_mist]);
    tx.moveCall({
        target:`${config.pkg}::file_blob::recharge`,
        arguments:[tx.object(config.storage),tx.pure.address(owner), new_coin]
    })
    tx.setGasBudget(2e6);
    return tx;
}

export function calcuate_fee(  config : parser.FeeConfigType, size : number) : number{
    let kbs = size >> 10;
    return Number(config.contract_cost) + Number(config.contract_fee)  + kbs * Number(config.wal_per_kb) * Number(config.price_wal_to_sui_1000) /1000 
}

export function save_fee(config:parser.FeeConfigType, size : number){
    let kbs = size >> 10;
    return kbs * Number(config.wal_per_kb) * Number(config.price_wal_to_sui_1000) /1000 ;
}

export async function  getStorage(sc:SuiClient) : Promise<parser.StorageType | undefined>{
    if(!sc) return undefined;
    const obj = await sc.getObject({ id : config.storage,options:{showContent:true,showBcs:true}});

    if(obj.data?.bcs?.dataType == 'moveObject'){
        console.log('parse bcs');
        let st = parser.Storage.parse(fromBase64(obj.data.bcs.bcsBytes))
        //console.log("storage",st);
        //console.log("storage profile_map.id",st.profile_map.id.id as unknown )
        //console.log("storage file_map.id",st.file_blob_map.id.id as unknown )
        //console.log(st.balance.value,st.feeConfig.contract_image_fee, st.feeConfig.contract_walrus_fee, st.feeConfig.walrus_kb_fee);
        return st;
    }

}

export function isBalanceEnough(storage:parser.StorageType,profile:Profile , size : number){
   let fee = calcuate_fee(storage.feeConfig, size)
   return Number(profile.balance) >= fee;
}

export async function  getProfileId(suiClient :SuiClient, owner :string) : Promise<string | undefined>{
    const tx = new Transaction();
    tx.setSender(owner);
    tx.moveCall({
        target:`${config.pkg}::file_blob::try_get_profile`,
        arguments:[ tx.object(config.storage),tx.pure.address(owner)]
    });
    tx.setGasBudget(1e7);

    let rsp = await suiClient.devInspectTransactionBlock({
        transactionBlock: tx,
        sender:owner,      
    })
    
    if(rsp.effects && rsp.effects.status.status == 'success'  && rsp.results && rsp.results.length> 0){
        let firstResult = rsp.results[0];
        if(firstResult.returnValues && firstResult.returnValues.length > 0){
            let [ values ,  type_name ] = firstResult.returnValues[0];
            if(type_name == '0x1::option::Option<address>'){
                if(values.length == 1 && values[0] == 0){
                    return ;
                } else{
                    let id = '0x' +toHex(new Uint8Array(values));
                    console.log(`owner: ${owner} \n profile: ${id}`);
                    return  id
                }
            }
        }
     } else{
        console.log('get profile error',rsp.effects.status.error)
     }
}

const PROFILE_CREATE_COST :bigint = 10_000_000n; 
//entry fun create_profile(storage : &mut Storage,coin : Coin<SUI>,ctx :&mut TxContext)
export  function getCreateProfileTx(amount_mist : bigint ,vault_id : string) : Transaction|null{
    if(amount_mist < PROFILE_CREATE_COST){
        console.log(`arg amout_mist invalid,less than ${PROFILE_CREATE_COST}`);
        return null;
    };
    const tx = new Transaction();
    console.log("getCreateProfileTx amount,vault_id",amount_mist,vault_id);
    let new_coin = tx.splitCoins(tx.gas,[amount_mist]);
    tx.moveCall({
        target:`${config.pkg}::file_blob::create_profile`,
        arguments:[tx.object(config.storage),new_coin, tx.pure.string(vault_id)]
    })
    tx.setGasBudget(1e7);
    return tx;
} 



export  function getWithdrawTx() : Transaction{

    const tx = new Transaction();
    tx.moveCall({
        target:`${config.pkg}::file_blob::withdraw`,
        arguments:[tx.object(config.storage)]
    })
    tx.setGasBudget(1e7);
    return tx;
} 
/**
 * //=================events ====================
public struct ProfileCreated has copy,drop{
    profile_address : address,
    sender : address
}
export const ResourceStruct = bcs.struct("Resource", {
    path: bcs.string(),
    headers: bcs.map(bcs.string(), bcs.string()),
    blob_id: BLOB_ID,
    blob_hash: DATA_HASH,
    range: OptionalRangeStruct,
});
 */


/**
public struct FileBlob has copy,drop{
    file_id : u256,
    blob_id : u256,
    start : u32,
    end : u32,
    mime_type : u8,
}
*/

export function getCost(gasUsed:GasCostSummary) : bigint{
    return BigInt(gasUsed.computationCost) + BigInt(gasUsed.storageCost)    - BigInt(gasUsed.storageRebate);
}

async function dryrun(suiClient : SuiClient,tx : Transaction):Promise<DryRunTransactionBlockResponse>{
    const txBytes = await tx.build({ client: suiClient });
    let resp = await suiClient.dryRunTransactionBlock({
        transactionBlock: txBytes,
    });
    return  resp;
}


/**
 * 添加File  , 在server 端
 */
export async function addFile(suiClient : SuiClient,signer: Keypair,
                            owner: string, file_id : string ,
                            contentType : number,size : number): Promise<bigint>{
    if(signer.getPublicKey().toSuiAddress() != config.operator){
        console.error('operator error: ',config.operator, ' manager:',signer.getPublicKey().toSuiAddress);
        return 0n;
    }
    let tx = getAddFileTx(owner ,file_id,contentType,size);
    const rsp = await suiClient.signAndExecuteTransaction({
        transaction: tx,
        signer : signer,
        options:{showEffects: true}
    });
    
    if(rsp.effects?.status.status == 'success'){
        const cost =  getCost(rsp.effects.gasUsed);
        console.log('addFile  success,gas cost',Number(cost)/1e9);
        return cost;
    } else{
        console.log('addFile failed,digest:',rsp.digest, ',rsp:',rsp)
    }
    return 0n;
}

export async function getProfile(sc : SuiClient, 
                                parentId : string, 
                                owner : string) : Promise<Profile|null>
{
    const rsp = await sc.getDynamicFieldObject({
        parentId,
        name : {
            type:'address',
            value: owner
        }
    });
    //console.log('profile dynamic field',rsp);
    if( rsp.data?.content?.dataType == 'moveObject'){
        
        const f = rsp.data.content.fields as unknown as DynamicField<Address,Struct<Profile>>;
        console.log("getDynamicProfile:profile fields",f.id.id,f.value.fields.balance, f.value.fields.file_ids, f.value.fields.vault_id);
        console.log("vault_id", f.value.fields.vault_id);
        return f.value.fields;
    } else{
        console.log('no data for owner:',owner);
        return null;
    }
    
}
 /*  
export async  function queryFileInfoObjects(suiClient:SuiClient, profileId:string,sender : string){

    return suiClient.getObject({
        id : profileId,
        options:{
            showContent:true,
            showBcs:true,
            
        }
    }).then((value )=>{

        if(value.data && value.data.content && value.data.content.dataType == 'moveObject'){
            console.log('file object of ',profileId);
            console.log('content fields',value.data.content.fields);
            console.log('bcs:', value.data.bcs);
        }
    })
   
}*/

import { FileData , FileAdded} from "./types";
import { Paginated } from "@tusky-io/ts-sdk";
import { FileAddedType } from "./suiParser";
import { resourceLimits } from "worker_threads";
import { parse } from "path";
export type Cursor = EventId|undefined|null
export type FileDataEvents<CursorType>  ={
    fileDatas : FileData[];
    cursors : CursorType[];
    cursorIndex : number;
    loading : boolean;
}

export interface PaginatedEventsCallback<CursorType>{
    events: FileDataEvents<CursorType>
    prev : (events : FileDataEvents<CursorType> )=>Promise<FileDataEvents<CursorType>>,
    next : (events : FileDataEvents<CursorType> )=>Promise<FileDataEvents<CursorType>>,
    home : ()=>Promise<FileDataEvents<CursorType>> 
}

export function hasNext<CursorType>(events :FileDataEvents<CursorType> | undefined){
    if(!events){ 
        return false;
    }
    return events.cursors.length > events.cursorIndex && events.cursorIndex >= 0
}

export function hasPrev<CursorType>(events :FileDataEvents<CursorType> | undefined){
    if(!events) {
        return false;
    }
    return events.cursors.length > 0 && events.cursorIndex < events.cursors.length
}

export function emptyFileDataEvents<CursorType>() : FileDataEvents<CursorType>{
    return { fileDatas:[],cursors : [], cursorIndex : -1 ,loading : true}
}

export async function  queryFileDataEventsInVault(vault_id : string|undefined, next:boolean = true,previous ? : FileDataEvents<string>, ) : Promise<FileDataEvents<string>>{
    const   result = emptyFileDataEvents<string>();
    if(!vault_id){
        console.log('queryFileDataEventsInVault vaultId invalid')
        return result
    }
    let cursor = undefined;
    if(previous ){
        let index = next ?  previous.cursorIndex  : previous.cursorIndex - 2;
        if(index < previous.cursors.length  && index >= 0){
            cursor = previous.cursors[index]
        }
    }

    let url = `/api/files_for?vault_id=${encodeURIComponent(vault_id)}`
    if(cursor){
        url += `&cursor=${encodeURIComponent(cursor)}`
    }
    console.log("images_by/addr  fetch ",url)
    const rsp = await fetch( url,{ method : 'GET', })
    result.loading = false;
    if(rsp.ok) {
        let value = await rsp.json()
        console.log('images_by : response json:',value);
        let pe = value.result as Paginated<FileData>
        for(let item of  pe.items){
            result.fileDatas.push(item)
        } 
        result.cursorIndex += 1;
        if(next && result.cursorIndex == result.cursors.length){
            result.cursors.push(pe.nextToken)
        } 
        return result;
    } else{
        console.error('query fail', rsp.status, url);
    }

    return result;
}

export async function  queryFileDataEvents(sc : SuiClient, next:boolean = true,previous ? : FileDataEvents<Cursor>, ) : Promise<FileDataEvents<Cursor>>{
    const   result = emptyFileDataEvents<Cursor>();
    console.log('queryFileDataEvents sc ,next', sc,next);
    if(!sc) {
        return  result
    }
    
    // let result :FileDataEvents = emptyFileBlobEvents();
    let cursor = undefined;
    if(previous ){
        let index = next ?  previous.cursorIndex  : previous.cursorIndex - 2;
        if(index < previous.cursors.length  && index >= 0){
            cursor = previous.cursors[index]
        }
    }
    console.log(`event type : ${config.pkg}::file_blob::FileAdded`);
    let events = await sc.queryEvents({query:{MoveEventType:`${config.pkg}::file_blob::FileAdded`},cursor})
    console.log('query events count:', events.data.length, 'hasNext',events.hasNextPage);
    const ids : string[] = [];
    for(let e of events.data){
        let r = e.parsedJson as FileAdded;
        r.file_data.timestampMs = e.timestampMs 
        console.log('fileAdded',r.file_data.vault_id,r.file_data.file_id);
        console.log('FileAdded,event',r);
        result.fileDatas.push(r.file_data);
    }

    if(previous){
        previous.cursors.forEach((value) =>result.cursors.push(value));
        result.cursorIndex = next ? previous.cursorIndex + 1 : previous.cursorIndex - 1;
        
    } else{
        result.cursorIndex = 0;

    }
    if(next && events.hasNextPage && result.cursorIndex == result.cursors.length){
        result.cursors.push(events.nextCursor)
    }
    result.loading = false
    console.log('queryFileDataEventsInVault  cursor count,data count, index', result.cursors.length, result.fileDatas.length, result.cursorIndex);
    return result;
}




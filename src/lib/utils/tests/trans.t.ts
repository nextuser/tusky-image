import { getSigner } from "./local_key";
import {getProfileId, getCreateProfileTx } from "../suiUtil"
import { Keypair,  } from "@mysten/sui/cryptography";
import config from "@/config/config.json";
import { MoveStruct, SuiClient } from "@mysten/sui/client";
import { getServerSideSuiClient } from "./suiClient";
import { getLocalSigner } from "./local_key";
import { ProfileCreated ,DynamicField,Profile,Address,Struct,FileBlobAddResult} from "../suiTypes";
import {  calcuate_fee,getProfile,addFile,getStorage} from "../suiUtil";
import { suiClient } from "@/contracts";
import fs from "fs";
import { getContentTypeByExtType,getMimeTypeByContentType } from "../content";
import {getServerTusky} from '@/lib/tusky/tusky_server'
import { queryFileDataEvents } from "../suiUtil";

const sc = getServerSideSuiClient();
const manager = getSigner();
const client = getLocalSigner();
const client_addr = client.getPublicKey().toSuiAddress();

/**
 * 查找当前用户的profile
 *  * 1. 获取当前用户的profile
 */
/**
 * 创建profile,client端 user执行
create_profile(storage : &mut Storage,
                        coin : Coin<SUI>,
                        vault_id : String,
*/
async function createProfile(suiClient : SuiClient,
                            amount : bigint,
                            vault_id:string,
                            keypair :Keypair) : Promise<string |undefined>{
    let tx = getCreateProfileTx(amount,vault_id);
    if(tx == null){
        return ;
    }
    let rsp = await suiClient.signAndExecuteTransaction({transaction:tx,signer:keypair,options:{showEffects:true,showEvents:true}});
    if(rsp.effects?.status.status == 'success'){
        for(let ev of rsp.events!){
            if(ev.type == `${config.pkg}::file_blob::ProfileCreated`){
                console.log('find type, json',ev.parsedJson as unknown);
               
                let profile = (ev.parsedJson as unknown as ProfileCreated).profile_address
                console.log(`createProfile : owner:${keypair.getPublicKey().toSuiAddress}  profile:${profile}`);
                return profile;
            }
        }
    } else{
        console.error('createProfile  failed,status failed,error: ',rsp.effects?.status.error);
    }
    console.log('fail to create profile,not find profile_address', rsp);
}

function queryRecentImages(){

}


async function test_all(){
    const tusky = getServerTusky();
    // let storage = await getStorage(suiClient);
    // if(storage == null) return;
    const  parentId = (await getStorage(sc))?.profile_map.id.id.bytes;
    if(!parentId){
        return;
    }
    //role client 
    let profile = await getProfile(sc,parentId,client_addr);
    let vault_id 
    
    if(!profile) {
        vault_id = (await tusky.vault.create(client_addr,{encrypted:false})).id
        if(!vault_id ){
            console.error('tusky crate vault error , owner:',client_addr);
            return ;
        }
         //role client 
        await createProfile(sc ,1000_000_000n,vault_id,client);
    } else {
        vault_id = profile.vault_id;
    }
    

    const path =  "/mnt/d/files/zhang4.jpg";
    const buffer = fs.readFileSync(path)

    const name = path.split('/').pop();
    const ext = path.split(".").pop();
    const contentType = getContentTypeByExtType(ext)
    const file_id = await tusky.file.upload(vault_id,buffer,{mimeType: 'image/jpg' })
    let hash =  'abcdefccc015';

    const signer = getSigner();
    await addFile(sc,signer,client_addr,file_id,contentType,buffer.length)


    queryFileDataEvents(sc).then((e)=>{
        for(let o of e.fileDatas){
            console.log('event :',o );
        }
    })
    
//     const blobId = 'tuGCqX_5qU-lhyts50TMagm9ZuHkmUVgLEhJHWBf0FE'
//     const blob = getTestFileBlobInfo(blobId,hash);
//     //role manager
//     await addFile(sc,manager,client_addr,file_id,contentType, blob.range.end - blob.range.start );
//     //role manager
//    // await addFileBlob( sc,blobId,[blob],manager);

//     getFileBlobsFor(sc,client_addr);

}

import { save_fee } from "../suiUtil";
function test_get_storage(){
    getStorage(sc).then((st)=>{
        if(st){
            console.log('storage balance',st.balance.value,'feeConfig=',st.feeConfig);
            const size = 1024*1024;
            const fee = calcuate_fee(st.feeConfig,size);
            console.log('calcuate_fee size of ',size , ' fee is',fee / 1e9);
            const count = 50*(1<<30)/size 
            const total_fee = save_fee(st.feeConfig,size) * count;
            const year_price = 48//dollars
            console.log('total fee',total_fee/1e9 ,' SUI');
            console.log('total 50g files * 100 years cost  ', year_price  * 100,' $')
            console.log('total cost cover years :',total_fee/1e9/year_price);
            console.log(` `,  )
        }
    })
}



//test_all();

//getRecentBlobs(sc);

test_get_storage();

function testQueryFee()
{
    getStorage(suiClient).then((st)=>{
        if(!st ){
            console.error('find storage failed')
            return ;
        }


        let fileSizes = [100,200,300,400,1000,2000];
        for(let l of fileSizes){
            const f  = calcuate_fee(st.feeConfig,l * 1024);
            console.log(`${l} KB Fee ${f/1e9 } SUI`);
        }
        console.log('feeConfig', st.feeConfig);
        // getProfile(suiClient,st.profile_map.id.id.bytes,client_addr).then((profile)=>{
        //     if(!profile){
        //         console.error('not found profile')
        //         return;
        //     }

        // });
    });
    
}


//testQueryFee();

//test_all();
//initFileBlobs(sc);
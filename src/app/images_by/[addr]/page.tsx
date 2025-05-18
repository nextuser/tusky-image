'use client'
import { blob } from "stream/consumers";
import { getExtensionFromMimeType, getExtTypeByContentType } from "@/lib/utils/content";
import Link from 'next/link';
import { FileInfo } from "@/lib/utils/types";
//import { getFileBlob } from "@/lib/utils/globalData";
import { getProfile, getStorage } from "@/lib/utils/suiUtil";
import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import { useEffect,useState } from "react";
import { useStorage } from "@/app/storage_provider";
import { FileUrl } from "@/lib/utils/types";
import { getTuskyFilesFor } from "@/lib/tusky/tusky_server";
import { File as TuskyFile ,Paginated} from '@tusky-io/ts-sdk';
import { getSiteUrl } from "@/lib/client/urlUtil";
import { updateUrlInfo,UrlInfo } from "@/lib/client/urlUtil";
import { getImageSiteUrl } from "@/lib/utils";
import { getTuskySiteUrl } from "@/lib/tusky/tusky_common";
import { Button } from "@/components/ui/button";
import { Profile } from "@/lib/utils/suiTypes";
import PaginatedShow from "@/components/paginated_show";
import { queryFileDataEventsInVault } from "@/lib/utils/suiUtil";
import { useSearchParams } from "next/navigation";
import { PaginatedEventsCallback ,emptyFileDataEvents} from "@/lib/utils/suiUtil";
import { FileDataEvents } from "@/lib/utils/suiUtil";
import { FileData } from "@/lib/utils/suiParser";

export default function Page() {

    // 使用示例
   const account = useCurrentAccount();
   const storage = useStorage()?.storage;
   const suiClient = useSuiClient();
   const [files ,setFiles] = useState<TuskyFile[]>([]);
   const [nextToken,setNextToken] = useState<string>();


   const queryProfile = async ()=>{
    console.log('queryProfile enter');
    if(!account || !storage) {
        console.log('queryProfile accoutn,storage',account,storage);
        return;
    }
    const parentId = storage.profile_map.id.id.bytes
    return  getProfile(suiClient,parentId,account.address);
   }

   const [vaultId,setVaultId] = useState<string>()
   const [urlInfo, setUrlInfo] = useState<UrlInfo>();

     
   useEffect(()=>{
    updateUrlInfo(setUrlInfo);
    queryProfile().then((p)=>{
        if(!p){ 
            console.log('queryProfile result',p);
            return;
        }
        setVaultId(p.vault_id)
    });
   },[account])

   const siteUrl = getSiteUrl(urlInfo);

   const searchParams = useSearchParams();
   const  isNext = searchParams.get('direction') != 'prev'
 
   const callback : PaginatedEventsCallback<string> = {
     events:emptyFileDataEvents<string>(),
     prev : (events : FileDataEvents<string> )=>{  return queryFileDataEventsInVault(vaultId,false, events)},
     next : (events : FileDataEvents<string> )=>{  return queryFileDataEventsInVault(vaultId,true, events)},
     home : ()=>{ return  queryFileDataEventsInVault(vaultId,true, undefined)}
   }


     const copyContent = async (text:string) => {
         try {
         await navigator.clipboard.writeText(text);
         console.log('Content copied to clipboard');
         } catch (err) {
         console.error('Failed to copy: ', err);
         }
     }


    if(! vaultId){
        return <h2><Link className="text-blue-900 underline hover:no-underline visited:text-blue-300"
                    href='/profile'>create profile first</Link></h2>
    }
 
     return (
         <div> 
         <PaginatedShow callback={callback} siteUrl={siteUrl}>
         </PaginatedShow>
         </div>
     )
}
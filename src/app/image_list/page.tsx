'use client'
import { blob } from "stream/consumers";
import { getExtTypeByContentType } from "@/lib/utils/content";
//import { headers } from "next/headers";
import Link from 'next/link';
import { FileData } from "@/lib/utils/types";
//import { getFileBlob } from "@/lib/utils/globalData";
import { Copy } from "lucide-react";
import CopyButton from "@/components/CopyButton";
import { emptyFileDataEvents,hasNext,hasPrev,queryFileDataEvents } from "@/lib/utils/suiUtil";
import { Suspense, useState } from "react";
import {FileDataEvents  } from "@/lib/utils/suiUtil";
import { useSuiClient } from "@mysten/dapp-kit";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { getSiteUrl, updateUrlInfo,UrlInfo } from "@/lib/client/urlUtil";
import { File as TuskyFile} from '@tusky-io/ts-sdk'
import { useSearchParams } from "next/navigation";
import { Cursor } from "@/lib/utils/suiUtil";
import { PaginatedEventsCallback } from "@/lib/utils/suiUtil";
import PaginatedShow from "@/components/paginated_show";

export default function Page() {
    return <Suspense fallback="<h2>Loading</h2>" ><ImageList/></Suspense>
}

function ImageList(){

   const suiClient = useSuiClient();
   const [ prevCursor ,setPrevCursor ] = useState();
  // 在组件挂载时提取 URL 信息

  const searchParams = useSearchParams();
  const  isNext = searchParams.get('direction') != 'prev'

  const callback : PaginatedEventsCallback<Cursor> = {
    events:emptyFileDataEvents<Cursor>(),
    prev : (events : FileDataEvents<Cursor> )=>{  return queryFileDataEvents(suiClient,false, events)},
    next : (events : FileDataEvents<Cursor> )=>{  return queryFileDataEvents(suiClient,true, events)},
    home : ()=>{ return  queryFileDataEvents(suiClient,true, undefined)}
  }

  const [urlInfo, setUrlInfo] = useState<UrlInfo>();

    useEffect(() => {
      updateUrlInfo(setUrlInfo);
      callback.home();
    },[suiClient]);
    const siteUrl = getSiteUrl(urlInfo);

    const copyContent = async (text:string) => {
        try {
        await navigator.clipboard.writeText(text);
        console.log('Content copied to clipboard');
        } catch (err) {
        console.error('Failed to copy: ', err);
        }
    }

    return (
        <div> 
        <PaginatedShow callback={callback} siteUrl={siteUrl}>

        </PaginatedShow>
        </div>
    )
}
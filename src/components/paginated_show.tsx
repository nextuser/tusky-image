'use client'
import { Paginated } from "@tusky-io/ts-sdk";
import { emptyFileDataEvents, FileDataEvents } from "@/lib/utils/suiUtil";
import { FileData } from "@/lib/utils/types";
import { getExtTypeByContentType } from "@/lib/utils/content";
import { getImageUrlByFileData } from "@/lib/tusky/tusky_common";
import Link from 'next/link'
import { useEffect,useState } from "react";
import { UrlInfo } from "@/lib/client/urlUtil";
import { updateUrlInfo ,getSiteUrl} from "@/lib/client/urlUtil";
import { PaginatedEventsCallback } from "@/lib/utils/suiUtil";
import { Button } from "./ui/button";
import { hasPrev,hasNext } from "@/lib/utils/suiUtil";
import { callbackify } from "util";

export default  function PaginatedShow<CursorType>(
    props:{callback : PaginatedEventsCallback<CursorType>,siteUrl : string}
    ) 
{
    let [events,setEvents] = useState(emptyFileDataEvents<CursorType>);
    useEffect(()=>{
        props.callback.home().then((e)=>{
            setEvents(e)
        });
    },[]);

    console.log('length:',props.callback.events.fileDatas.length);
    if(events && events.loading ){
        return  <div><h2>Loading</h2></div>
    }
    if(events && events.fileDatas.length == 0){
        return  <div><h2>no data</h2></div>
    }
    return <div className='mx-4'> <div className="flex justify-start flex-wrap ">
    {events &&  events.fileDatas.map( (fileData:FileData,index)=>{
                const type = getExtTypeByContentType(fileData.mime_type)
                const file_id = fileData.file_id
                const imageUrl = getImageUrlByFileData(props.siteUrl,fileData);
                return (
                <div key={file_id}  >
                    <Link href={`/imageView/${encodeURIComponent(file_id)}`} >
                        <img src={imageUrl}  alt={file_id} 
                            className="max-w-[200px] max-h-[200px] object-cover"
                        />
                    </Link>
                    </div>)
                })
    }</div>
    <div className="flex flex-row  px-2 pt-2">
        <Button  onClick={ () => props.callback.home().then((r)=>setEvents(r))}
        
        className="bg-blue-300 hover:bg-blue-400 text-gray-800 font-bold py-1 px-2 rounded-xs "
        >Home</Button>
        <Button  onClick={()=> props.callback.prev(events).then((r)=>setEvents(r))} disabled = {!hasPrev(props.callback.events)}
        className="bg-blue-300 hover:bg-blue-400 text-gray-800 font-bold py-1 px-2 rounded-xs "
        >Prev</Button>
        <Button  onClick={ () => props.callback.next(events).then((r)=>setEvents(r))} disabled = {!hasNext(props.callback.events)}
        className="bg-blue-300 hover:bg-blue-400 text-gray-800 font-bold py-1 px-2 rounded-xs " 
        > Next</Button>
    </div>
    </div>
}
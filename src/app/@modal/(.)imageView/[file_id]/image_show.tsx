'use client'
import { use } from 'react'
import Image from 'next/image'
import CopyButton from '@/components/CopyButton'
import { FileUrl } from '@/lib/utils/types'
import { WindArrowDown } from 'lucide-react'
import { Copy } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default  function ImageShow( params : {fileInfo  : FileUrl}){
    const copyContent = async (text:string) => {
        try {
        await navigator.clipboard.writeText(text);
        console.log('Content copied to clipboard');
        } catch (err) {
        console.error('Failed to copy: ', err);
        }
    }   
    let f = params.fileInfo
    console.log('url ',f.url);
    return <div className='flex justify-center items-center fixed inset-0 bg-gray-500/[.8]' onClick={()=>{if(window){ window.history.back()}} }>
               <div  >
               <div className="w-20 h-20 bg-gray-200 rounded overflow-hidden">
                <img src={f.url} alt={f.name}  className="w-full h-full  object-cover" onClick={(e)=>{e.stopPropagation()}}></img>
                </div>
                <Input type="text" value={f.url} disabled={true} onClick={(e)=>{e.stopPropagation()}}/> <br/>
                <Button onClick={(e)=>{ copyContent(f.url)}}><Copy></Copy>Copy url</Button>
                
                </div>

            </div>
}

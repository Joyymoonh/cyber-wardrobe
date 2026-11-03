import {NextResponse} from "next/server";
export async function POST(){return NextResponse.json({error:"购物链接导入已停用，请上传衣物照片"},{status:410});}

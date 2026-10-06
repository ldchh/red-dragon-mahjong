import {redeemRequest,nativeServiceInfo} from './service-client.js?v=1.9.20';
import {sharedRank} from './shared-rank.js?v=1.9.20';
const MESSAGES={invalid_code:'兑换码无效，请检查后重试。',code_used:'这个兑换码已被使用。',too_many_attempts:'尝试过于频繁，请稍后再试。',
    invalid_device:'本机资料暂时不可用，请重新打开。',service_unavailable:'兑换服务暂时未就绪，请稍后再试。',service_busy:'兑换服务繁忙，请稍后再试。',network_failed:'连接未完成，请检查网络后重试。'};
export function installRedeemUI(wallet){
    const form=document.getElementById('redeem-form'),input=document.getElementById('redeem-code-input'),button=document.getElementById('redeem-submit'),status=document.getElementById('redeem-status');let busy=false;
    form.addEventListener('submit',async event=>{
        event.preventDefault();if(busy)return;
        const code=input.value.trim();if(!code){status.textContent='请输入兑换码。';input.focus();return;}
        if(wallet.readOnly||!sharedRank){status.textContent=/HongzhongMahjong\//.test(navigator.userAgent)&&!nativeServiceInfo()
            ?'请安装新版应用后兑换，本机礼券与装扮已保留。':'本机资料暂时不可用，请重新打开。';return;}
        busy=true;button.disabled=input.disabled=true;status.textContent='正在兑换…';
        try{
            const answer=await redeemRequest(code,sharedRank.snapshot().device);
            if(!answer?.ok)throw Error(answer?.reason||'service_unavailable');
            const apply=()=>wallet.redeem(answer.receipt);
            const result=navigator.locks?await navigator.locks.request('hz-wallet-redemption',apply):apply();
            if(result.ok){status.textContent='兑换成功，获得礼券 ×1';input.value='';}
            else status.textContent=result.reason==='already_redeemed'?'你已兑换过这个兑换码。':'礼券保存未完成，请重试兑换。';
        }catch(error){status.textContent=MESSAGES[error.message]||'连接未完成，请检查网络后重试。';}
        finally{busy=false;button.disabled=input.disabled=false;}
    });
}

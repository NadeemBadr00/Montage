/**
 * 🧠 AI4Montage Brain Configuration & Keys
 * Centralized key management for all AI operations.
 */

// قائمة المفاتيح الكاملة لـ AI4Montage (أكثر من 50 مفتاحاً)
const AI4MONTAGE_KEYS_POOL = [
    "AIzaSyBN3C93CB-Cog1SycjlGoLWgDzN4deYtoI",
    "AIzaSyD1tOVALG03EH2rj-pB7vP3nnVRd_qvZ3U",
    "AIzaSyC_7JP4WCxvmBeIuLcNQYg9ZA9Bgp9SiDQ",
    "AIzaSyB86pxAvG1BXy3g8D3C8oQ7VSivdxS3MbI",
    "AIzaSyDPGuCiNDbWF8D3rncXwv_EipMTMTcv4-I",
    "AIzaSyDcaT51JOe-0_4_H41xqSPPviHmWmMfxj8",
    "AIzaSyDb9V1vqXcilDJx8D2iHk52--sZhioeG2w",
    "AIzaSyB4-UD8LcVD7WCN_U2F9u4hqHaP_-BGmRk",
    "AIzaSyCzxAi7UxnvJFollr0lVaQMd8TfwHj__oo",
    "AIzaSyDl51ZgJjb5K1kzorMkzDu3PLjWMTMR_co",
    "AIzaSyDinruhBeVGIy_giyRtfyNnZ8fPxdRqpcE",
    "AIzaSyC1YC5FFYe16W0QpfAA1PCDmwSlULPYwQw",
    "AIzaSyDs1QUbBaAnuZpNcd20TQGg5imiBMYV5Jo",
    "AIzaSyCgWiKSkc_bnldCRAy130TXd5jWsg8qKHI",
    "AIzaSyD-SM2M0jOOP0BnwAJRbGd5HS3irqOFzqc",
    "AIzaSyAnJicjY8-aorsNe-tnf-sss5ZWT11cPVo",
    "AIzaSyCSB4fZ9QSURj-xl37HYqeNUSQUeAwdA2g",
    "AIzaSyDdGWI0svALRkqbZtub9UfBk9vvmF76OrM",
    "AIzaSyAoxmkZK8aLjNIWDiQczwTVMcEwJ76gxJw",
    "AIzaSyCceLxDnjyMAOPbo2JicvlD7K9_miPAQfE",
    "AIzaSyB2IzTFYPHQp0ctEa1iaoU82WbL09mKpvg",
    "AIzaSyC_FAGDSUL_vnIoprdsgPqvYppuKceJP2w",
    "AIzaSyDLnCHwiIwD02EHGBy_CLsscZ4dPMCNHwc",
    "AIzaSyCYo2P_S4qJsMRc0YEARnsxDNNNYze9v5A",
    "AIzaSyADUyYvlMfp2WxgquGR4AzdmgXbIQDxbE0",
    "AIzaSyDiHwnKVfAKJWcmsDJCpncJlGe72VOZLuM",
    "AIzaSyBrQ_CN3zK0hHXnYZri-cWKgnI6kvV_Drk",
    "AIzaSyC4JYl9BPiZciRiL3dasbJazUYGAw-JVNE",
    "AIzaSyDYGrljCh01gorEPQk1aXtIRiUnp0EN6fM",
    "AIzaSyDlLhk2fiU9-aN2SIxgmVWafHF77Z7r_Ec",
    "AIzaSyD3TFTBZ_tiIj3uHXYlMhERXNRuxRScZ_8",
    "AIzaSyBbBIzg-tJLRUkIPECvC_Tqe2eOsG2ZTmg",
    "AIzaSyBMdu5xEUCs-QE7u49rjHdFZYGeMJMC_Tk",
    "AIzaSyAhE7K0v4R7fzPemP-2FVtK_14N57RaC3g",
    "AIzaSyA0nv6qsVyLpvUQdytqUjqjGQfj4zGciYk",
    "AIzaSyD4cnNRkh482o07U3HfoDuYX3A71xkz8z8",
    "AIzaSyAjS_A3LuFs-1oI255mFDn2rL7Eto5c9I0",
    "AIzaSyCkBBjXLs-lKAfwbdZcACZJ79C_CNjzENs",
    "AIzaSyB8Dg7alT2cEWtRCuTj37MkCrqg6f-z9MY",
    "AIzaSyC1zY8mEfG6wUCBE9MccyA_gtMPQEtenIY",
    "AIzaSyDno6x2_85j79UnsfjN7AnoaA9uidsjppM",
    "AIzaSyBtjJO4hWnA-YCmQdaUuqiqLkt18YAL7_I",
    "AIzaSyA6W2S0e5uJI3Uw5rHQoWjr2i_Qy6YQVzg",
    "AIzaSyBeivg37E6dehHPWp85SsHtN1N0o-MUB8Q",
    "AIzaSyDx-f4Ms0J9ZIwUINavmMuIFnBtgi7Bk1E",
    "AIzaSyDn6aa1RS2gHDwi0tPZZsi4AsJVd3vEW-Y",
    "AIzaSyBStP5ltrP8k88TyaP8NdV1DRD24byzM8E",
    "AIzaSyDVFCnfF9se6nE3bwIhIQOu91_HLxpfZDY",
    "AIzaSyCC7QY0D1mBzMgDymahmqriw_t-Q1RgEUo",
    "AIzaSyBEj0kvZTSrHPvwZAQLiiio0DQYBoGugVU",
    "AIzaSyB_mbku4fzxrStOwLdtGDyALYpPmZZz2WE",
    "AIzaSyDAxnpdAta5N78jy6pQDgsHaE5rjXDfJ4s",
    "AIzaSyDsL1KCgookMuWlFP1Zk8wf2w91HDo9LzY",
    "AIzaSyB-ooWktZ4UffBZgl3ScpK50yywdRV5YtU",
    "AIzaSyC093aL2JapVjTy_09iD7aeVpREoP1Ea1o",
    "AIzaSyCkuvWA16ky5xNMmZShvIq-EO_zO3_kIy4",
    "AIzaSyA0PGYnOVunEuUJHIEPcAZoHeszwaYzLBI",
    "AIzaSyCTtc0P7C5XczrB0u5shYTeK2HfgqMAAiU",
    "AIzaSyAfche8yDzTKtj92-WQoek_yvpXuTgzMoo",
    "AIzaSyCJmHFF_jdG-iHDx7T_lcT4a3gg--iQNWA",
    "AIzaSyA_OorLkiCcBmUEVTg7ArRMFbzNZavblus"
];

// ترتيب الموديلات الأساسية - gemini-2.5-flash هو الأساس للسرعة والدقة.
// تم إضافة الموديلات الأقدم في حالة فشل الحديثة
export const AI4MONTAGE_MODELS = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-3.5-flash", 
    "gemini-3-flash-preview", 
    "gemini-3.1-flash-lite", 
];

export class AI4MontageBrainCore {
    private availableKeys: string[];

    constructor() {
        this.availableKeys = [...AI4MONTAGE_KEYS_POOL];
    }

    /**
     * إرجاع جميع المفاتيح المتاحة (بما في ذلك مفتاح المستخدم إن وجد) بترتيب عشوائي
     */
    public getShuffledKeys(): string[] {
        const userKey = document.getElementById('ai4montage-api-key') || document.getElementById('gemini-api-key');
        const userKeyValue = (userKey as HTMLInputElement)?.value?.trim();
        
        let keys = [...this.availableKeys];
        if (userKeyValue && !keys.includes(userKeyValue)) {
            keys.push(userKeyValue);
        }

        return keys.sort(() => Math.random() - 0.5);
    }

    /**
     * استبعاد مفتاح تم التأكد من فشله تماماً لتجنب استخدامه مرة أخرى في نفس الجلسة
     */
    public banKey(key: string) {
        this.availableKeys = this.availableKeys.filter(k => k !== key);
    }
}

// إنشاء مثيل وحيد (Singleton) ليكون المخ المركزي
export const BrainInstance = new AI4MontageBrainCore();

import { Component, input, computed } from '@angular/core';
const icons: Record<string,string> = {
 eye:'M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
 share:'M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6M6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6m12 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6M9 10l6-4M9 14l6 4',
 utensils:'M4 3v7a3 3 0 0 0 6 0V3M7 3v18M20 3c-4 0-5 5-5 9h5m0-9v18',
 'chevron-up':'m6 15 6-6 6 6',
 moon:'M21 13a9 9 0 1 1-10-10 7 7 0 0 0 10 10Z', 'chevron-down':'m6 9 6 6 6-6',
 arrow:'M7 17 17 7M7 7h10v10', right:'M5 12h14m-6-6 6 6-6 6', left:'M19 12H5m6-6-6 6 6 6', plus:'M12 5v14M5 12h14', close:'m6 6 12 12M6 18 18 6', search:'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
 home:'m3 10 9-7 9 7v11h-6v-7H9v7H3z', grid:'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z', map:'m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2zm6-2v16m6-14v16', pin:'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
 hotel:'M3 21V3m18 18V9H3m0 8h18M7 9V5h10v4m-7 4h4', people:'M16 21v-3a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v3m20 0v-3a4 4 0 0 0-3-3.87M13 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0m4-3.87a4 4 0 0 1 0 7.75',
 quote:'M6 3h10l4 4v14H4V3zm8 0v6h6M8 13h8m-8 4h6', clock:'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0m-10-6v6l4 2', check:'m5 12 4 4L19 6', calendar:'M5 3v4m14-4v4M3 10h18M3 5h18v16H3z',
 settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M9 2h6l1 4 4 1 2 5-3 3v4l-5 3-3-3H7l-5-4 2-4V7l4-2z', bell:'M18 8a6 6 0 0 0-12 0v7l-3 3h18l-3-3zM10 21h4', menu:'M4 6h16M4 12h16M4 18h16', filter:'M4 5h16l-6 7v7l-4 2v-9z', refresh:'M20 7a9 9 0 1 0 1 9m-1-9V2m0 5h-5', logout:'M9 21H3V3h6m7 4 5 5-5 5m-8-5h13', edit:'m16 3 5 5-12 12-6 1 1-6zM14 5l5 5', trash:'M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7', star:'m12 2 3 6 7 1-5 5 1 8-6-4-6 4 1-8-5-5 7-1z', heart:'M20 4c-3-2-6 0-8 2-2-2-5-4-8-2-5 4 0 10 8 16 8-6 13-12 8-16z', globe:'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0M2 12h20M12 2c6 6 6 14 0 20-6-6-6-14 0-20', more:'M5 11v2m7-2v2m7-2v2', download:'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5', chart:'M4 20V10m8 10V4m8 16v-7', sun:'M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0M12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2', link:'M9 15 15 9m-6 0-3-3a4 4 0 0 0-6 6l5 5a4 4 0 0 0 6 0m2-2 3 3a4 4 0 0 0 6-6l-5-5a4 4 0 0 0-6 0', mail:'M3 5h18v14H3zm0 0 9 8 9-8', lock:'M5 10h14v11H5zM8 10V6a4 4 0 0 1 8 0v4', suitcase:'M4 7h16v14H4zM9 7V3h6v4M8 7v14m8-14v14'
};
@Component({selector:'tp-icon',templateUrl: './icon.html',host:{class:'tp-icon'},styleUrl: './icon.scss'})
export class Icon { name=input('arrow'); path=computed(()=>icons[this.name()] || icons['grid']); }

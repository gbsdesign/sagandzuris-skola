// Auto-generated chant media registry linking Google Drive resources
import { RUNTIME_MEDIA, recordingsAreHidden } from './runtimeRecordings';
export interface ChantNoteItem {
  name: string;
  id: string;
  url: string;
  viewUrl: string;
}

export interface ChantMediaItem {
  key: string;
  title: string;
  folderId: string;
  folderUrl: string;
  voice1Url?: string;
  voice2Url?: string;
  voice3Url?: string;
  allVoicesUrl?: string;
  tracks: [string, string, string, string]; // [voice1, voice2, voice3, all]
  availableVoices: {
    voice1: boolean;
    voice2: boolean;
    voice3: boolean;
    all: boolean;
  };
  notes: ChantNoteItem[];
  videoUrl?: string;
  lyrics?: string;
  duration?: number; // seconds, shown until the audio metadata loads
}

export const CHANT_MEDIA_REGISTRY: Record<string, ChantMediaItem> = {
  "1": {
    "key": "1",
    "title": "1. გ.ს. მრჩობლი კვერექსი 3 გზის",
    "folderId": "1Ia_i1FR3rq91LuNTXjYMRl9bDdVMBIXc",
    "folderUrl": "https://drive.google.com/drive/folders/1Ia_i1FR3rq91LuNTXjYMRl9bDdVMBIXc",
    "voice1Url": "/audio/mrchobli-kvereksi/voice1.mp3",
    "voice2Url": "/audio/mrchobli-kvereksi/voice2.mp3",
    "voice3Url": "/audio/mrchobli-kvereksi/voice3.mp3",
    "allVoicesUrl": "/audio/mrchobli-kvereksi/all_voices.mp3",
    "tracks": [
      "/audio/mrchobli-kvereksi/voice1.mp3",
      "/audio/mrchobli-kvereksi/voice2.mp3",
      "/audio/mrchobli-kvereksi/voice3.mp3",
      "/audio/mrchobli-kvereksi/all_voices.mp3"
    ],
    "availableVoices": {
      "voice1": true,
      "voice2": true,
      "voice3": true,
      "all": true
    },
    "notes": [
      {
        "name": "Screenshot 2025-08-08 221743.png",
        "id": "1_-8NoZyKT93tw49yjEH65qyvd9T_1Mwf",
        "url": "/notes/mrchobli-kvereksi/notes1.png",
        "viewUrl": "https://drive.google.com/file/d/1_-8NoZyKT93tw49yjEH65qyvd9T_1Mwf/view?usp=drivesdk"
      }
    ],
    "lyrics": "უფალო შეგვიწყალენ, უფალო შეგვიწყალენ, უფალო შეგვიწყალენ.",
    "duration": 22
  },
  "1.1": {
    "key": "1.1",
    "title": "1.1 გ.ს და სულისაცა შენისათანა",
    "folderId": "1DxzRnOQ1RGsABltHWbvDBZprnXac33vv",
    "folderUrl": "https://drive.google.com/drive/folders/1DxzRnOQ1RGsABltHWbvDBZprnXac33vv",
    "voice1Url": "/audio/da-sulisaca/voice1.mp3",
    "voice2Url": "/audio/da-sulisaca/voice2.mp3",
    "voice3Url": "/audio/da-sulisaca/voice3.mp3",
    "allVoicesUrl": "/audio/da-sulisaca/all_voices.mp3",
    "tracks": [
      "/audio/da-sulisaca/voice1.mp3",
      "/audio/da-sulisaca/voice2.mp3",
      "/audio/da-sulisaca/voice3.mp3",
      "/audio/da-sulisaca/all_voices.mp3"
    ],
    "availableVoices": {
      "voice1": true,
      "voice2": true,
      "voice3": true,
      "all": true
    },
    "notes": [],
    "lyrics": "და სულისაცა შენისათანა.",
    "duration": 18
  },
  "2": {
  "key": "2",
  "title": "2. გ.ს. აკურთხევ სული ჩემი",
  "folderId": "1gpr0f4foEmM5MMMqJLCagFsYyd3b0gvf",
  "folderUrl": "https://drive.google.com/drive/folders/1gpr0f4foEmM5MMMqJLCagFsYyd3b0gvf",
  "voice1Url": "https://drive.usercontent.google.com/download?id=15VdLZFon_885k05rMS9LsQMYRJVtCsaa&export=download",
  "voice2Url": "https://drive.usercontent.google.com/download?id=1rECDa32kEauFHdLnzD4_G_R-88AyUZND&export=download",
  "voice3Url": "https://drive.usercontent.google.com/download?id=1sOtGFBCCLdou49Y-HYj9nxq4Qc8a7mvL&export=download",
  "allVoicesUrl": "https://drive.usercontent.google.com/download?id=1KeCVYWXbClkB6K1j1QT1O9TOU91-SkRH&export=download",
  "tracks": [
    "https://drive.usercontent.google.com/download?id=15VdLZFon_885k05rMS9LsQMYRJVtCsaa&export=download",
    "https://drive.usercontent.google.com/download?id=1rECDa32kEauFHdLnzD4_G_R-88AyUZND&export=download",
    "https://drive.usercontent.google.com/download?id=1sOtGFBCCLdou49Y-HYj9nxq4Qc8a7mvL&export=download",
    "https://drive.usercontent.google.com/download?id=1KeCVYWXbClkB6K1j1QT1O9TOU91-SkRH&export=download"
  ],
  "availableVoices": {
    "voice1": true,
    "voice2": true,
    "voice3": true,
    "all": true
  },
  "notes": [
    {
      "name": "Screenshot 2025-08-08 232206.png",
      "id": "1GAdEiC-CALl3lzzmIQW0jD74LiqPcb_h",
      "url": "https://lh3.googleusercontent.com/d/1GAdEiC-CALl3lzzmIQW0jD74LiqPcb_h",
      "viewUrl": "https://drive.google.com/file/d/1GAdEiC-CALl3lzzmIQW0jD74LiqPcb_h/view?usp=drivesdk"
    }
  ]
},
  "3": {
  "key": "3",
  "title": "3. გ.ს. მხოლოდ შობილო",
  "folderId": "1NAasMEa53JmqDwqUheLCCdaXeeL9mNDa",
  "folderUrl": "https://drive.google.com/drive/folders/1NAasMEa53JmqDwqUheLCCdaXeeL9mNDa",
  "voice1Url": "/audio/mholod-shobilo/voice1.mp3",
  "voice2Url": "/audio/mholod-shobilo/voice2.mp3",
  "voice3Url": "/audio/mholod-shobilo/voice3.mp3",
  "allVoicesUrl": "/audio/mholod-shobilo/all_voices.mp3",
  "tracks": [
    "/audio/mholod-shobilo/voice1.mp3",
    "/audio/mholod-shobilo/voice2.mp3",
    "/audio/mholod-shobilo/voice3.mp3",
    "/audio/mholod-shobilo/all_voices.mp3"
  ],
  "availableVoices": {
    "voice1": true,
    "voice2": true,
    "voice3": true,
    "all": true
  },
  "notes": [
    {
      "name": "7.jpg",
      "id": "1K4ajn8z4mi2zmbIjSd6wUl-6YkKF2q4H",
      "url": "https://lh3.googleusercontent.com/d/1K4ajn8z4mi2zmbIjSd6wUl-6YkKF2q4H",
      "viewUrl": "https://drive.google.com/file/d/1K4ajn8z4mi2zmbIjSd6wUl-6YkKF2q4H/view?usp=drivesdk"
    },
    {
      "name": "8.jpg",
      "id": "1cKH4W9IUczr6LktLlisbGCSDc52PKaLB",
      "url": "https://lh3.googleusercontent.com/d/1cKH4W9IUczr6LktLlisbGCSDc52PKaLB",
      "viewUrl": "https://drive.google.com/file/d/1cKH4W9IUczr6LktLlisbGCSDc52PKaLB/view?usp=drivesdk"
    },
    {
      "name": "9.jpg",
      "id": "1hIT48fnSoASR1Dgec_UC3uW_LWJFhACp",
      "url": "https://lh3.googleusercontent.com/d/1hIT48fnSoASR1Dgec_UC3uW_LWJFhACp",
      "viewUrl": "https://drive.google.com/file/d/1hIT48fnSoASR1Dgec_UC3uW_LWJFhACp/view?usp=drivesdk"
    }
  ],
  "lyrics": "მხოლოდ-შობილი ძე და სიტყუაჲ ღმრთისაჲ,\nუკუდავი, რომელმან თავს-იდევ ჩუენისა ცხორებისათჳს\nჴორც-შესხმაჲ წმიდისაგან ღმრთის-მშობელისა\nდა მარადის ქალწულისა მარიამისა,\nშეუცვალებელად განკაცენ,\nდა ჯუარს-ეცუ, ქრისტე ღმერთო,\nსიკუდილითა სიკუდილი დასთრგუნე,\nერთი წმიდისა სამებისაჲ,\nთანა-დიდებული მამისა და წმიდისა სულისაჲ,\nგუაცხოვნენ ჩუენ.",
  "duration": 153
},
  "4": {
  "key": "4",
  "title": "4. გ.ს. ანტიფონები",
  "folderId": "1b6wI5mbgacpdqyou4krXi681ERudL-dR",
  "folderUrl": "https://drive.google.com/drive/folders/1b6wI5mbgacpdqyou4krXi681ERudL-dR",
  "voice1Url": "",
  "voice2Url": "",
  "voice3Url": "",
  "allVoicesUrl": "",
  "tracks": [
    "",
    "",
    "",
    ""
  ],
  "availableVoices": {
    "voice1": false,
    "voice2": false,
    "voice3": false,
    "all": false
  },
  "notes": [
    {
      "name": "050.jpg",
      "id": "1hDJmvUq3mtA6fWXN69ZRX5BI7z_s5kBU",
      "url": "https://lh3.googleusercontent.com/d/1hDJmvUq3mtA6fWXN69ZRX5BI7z_s5kBU",
      "viewUrl": "https://drive.google.com/file/d/1hDJmvUq3mtA6fWXN69ZRX5BI7z_s5kBU/view?usp=drivesdk"
    },
    {
      "name": "051.jpg",
      "id": "1QjJ8hZSY1dQnmNr3ZmntMnFDAhu6baPC",
      "url": "https://lh3.googleusercontent.com/d/1QjJ8hZSY1dQnmNr3ZmntMnFDAhu6baPC",
      "viewUrl": "https://drive.google.com/file/d/1QjJ8hZSY1dQnmNr3ZmntMnFDAhu6baPC/view?usp=drivesdk"
    },
    {
      "name": "5.jpg",
      "id": "1Mva99FNF3Yc3hk_XNeXvdGkBd7reKi8x",
      "url": "https://lh3.googleusercontent.com/d/1Mva99FNF3Yc3hk_XNeXvdGkBd7reKi8x",
      "viewUrl": "https://drive.google.com/file/d/1Mva99FNF3Yc3hk_XNeXvdGkBd7reKi8x/view?usp=drivesdk"
    },
    {
      "name": "6.jpg",
      "id": "1lQKuBeugprEXE4sUHum3Cv7EG758B2Cl",
      "url": "https://lh3.googleusercontent.com/d/1lQKuBeugprEXE4sUHum3Cv7EG758B2Cl",
      "viewUrl": "https://drive.google.com/file/d/1lQKuBeugprEXE4sUHum3Cv7EG758B2Cl/view?usp=drivesdk"
    }
  ]
},
  "5": {
  "key": "5",
  "title": "5. გ.ს. ნეტარებები",
  "folderId": "19APj6Bs6nGQIRFS3k-BzyATt0XbQ3McL",
  "folderUrl": "https://drive.google.com/drive/folders/19APj6Bs6nGQIRFS3k-BzyATt0XbQ3McL",
  "voice1Url": "https://drive.usercontent.google.com/download?id=1gnWL7YVSMecWH98K29hMbypp4bE5dJ37&export=download",
  "voice2Url": "https://drive.usercontent.google.com/download?id=1Dp9LZuvirG6mbDCujnWcHWlKa6QE_ZrA&export=download",
  "voice3Url": "https://drive.usercontent.google.com/download?id=19WR_p8Y8Va7iUiHn3V35_vVFcA6gzFAF&export=download",
  "allVoicesUrl": "https://drive.usercontent.google.com/download?id=1SB8msE-2b9jnHKVMiB4cGgZh7OMLbqt4&export=download",
  "tracks": [
    "https://drive.usercontent.google.com/download?id=1gnWL7YVSMecWH98K29hMbypp4bE5dJ37&export=download",
    "https://drive.usercontent.google.com/download?id=1Dp9LZuvirG6mbDCujnWcHWlKa6QE_ZrA&export=download",
    "https://drive.usercontent.google.com/download?id=19WR_p8Y8Va7iUiHn3V35_vVFcA6gzFAF&export=download",
    "https://drive.usercontent.google.com/download?id=1SB8msE-2b9jnHKVMiB4cGgZh7OMLbqt4&export=download"
  ],
  "availableVoices": {
    "voice1": true,
    "voice2": true,
    "voice3": true,
    "all": true
  },
  "notes": [
    {
      "name": "10.jpg",
      "id": "149eukpgInsIPG7bPk_MJO0oZmQl7JtaO",
      "url": "https://lh3.googleusercontent.com/d/149eukpgInsIPG7bPk_MJO0oZmQl7JtaO",
      "viewUrl": "https://drive.google.com/file/d/149eukpgInsIPG7bPk_MJO0oZmQl7JtaO/view?usp=drivesdk"
    },
    {
      "name": "11.jpg",
      "id": "1q3as-w0SdyloBoZkgl4G4CVZ3HQhyyiJ",
      "url": "https://lh3.googleusercontent.com/d/1q3as-w0SdyloBoZkgl4G4CVZ3HQhyyiJ",
      "viewUrl": "https://drive.google.com/file/d/1q3as-w0SdyloBoZkgl4G4CVZ3HQhyyiJ/view?usp=drivesdk"
    },
    {
      "name": "12.jpg",
      "id": "1Gz_C9n52mBm3zTV2VB5yawHuTCw83v5N",
      "url": "https://lh3.googleusercontent.com/d/1Gz_C9n52mBm3zTV2VB5yawHuTCw83v5N",
      "viewUrl": "https://drive.google.com/file/d/1Gz_C9n52mBm3zTV2VB5yawHuTCw83v5N/view?usp=drivesdk"
    },
    {
      "name": "13.jpg",
      "id": "141_Er4CYBOTNNcFMjLXRRtr8t-PWsuud",
      "url": "https://lh3.googleusercontent.com/d/141_Er4CYBOTNNcFMjLXRRtr8t-PWsuud",
      "viewUrl": "https://drive.google.com/file/d/141_Er4CYBOTNNcFMjLXRRtr8t-PWsuud/view?usp=drivesdk"
    },
    {
      "name": "14.jpg",
      "id": "1ZI86ZLSC6SN0V1FNMZ-WvgUgwpiOh9k1",
      "url": "https://lh3.googleusercontent.com/d/1ZI86ZLSC6SN0V1FNMZ-WvgUgwpiOh9k1",
      "viewUrl": "https://drive.google.com/file/d/1ZI86ZLSC6SN0V1FNMZ-WvgUgwpiOh9k1/view?usp=drivesdk"
    },
    {
      "name": "15.jpg",
      "id": "1Mlc4OxBJiAtzFEkOY95NBFLES6e0bx9i",
      "url": "https://lh3.googleusercontent.com/d/1Mlc4OxBJiAtzFEkOY95NBFLES6e0bx9i",
      "viewUrl": "https://drive.google.com/file/d/1Mlc4OxBJiAtzFEkOY95NBFLES6e0bx9i/view?usp=drivesdk"
    },
    {
      "name": "16.jpg",
      "id": "1XtzlhUtuIiTFUsHDA-Wl1wTfIFir99dv",
      "url": "https://lh3.googleusercontent.com/d/1XtzlhUtuIiTFUsHDA-Wl1wTfIFir99dv",
      "viewUrl": "https://drive.google.com/file/d/1XtzlhUtuIiTFUsHDA-Wl1wTfIFir99dv/view?usp=drivesdk"
    }
  ]
},
  "6": {
  "key": "6",
  "title": "6. გ.ს მოვედით თაყვანი ვსცეთ",
  "folderId": "1k4Zcm3zx84aRQJhNz-ih7-73vAz_0wNy",
  "folderUrl": "https://drive.google.com/drive/folders/1k4Zcm3zx84aRQJhNz-ih7-73vAz_0wNy",
  "voice1Url": "https://drive.usercontent.google.com/download?id=1Tsjl9Vg0AeVZghPrv62wgsyuZOwJr-CT&export=download",
  "voice2Url": "https://drive.usercontent.google.com/download?id=1W3jiG4ZznuJ-ZIRah9UVgIrYcauwQTck&export=download",
  "voice3Url": "https://drive.usercontent.google.com/download?id=1toCEB4qn-UzwGYhv5cJmsVucFZ_H7Tkd&export=download",
  "allVoicesUrl": "https://drive.usercontent.google.com/download?id=1jDrLWu6myZJWDFnn8sBzbd2Si2PgivOO&export=download",
  "tracks": [
    "https://drive.usercontent.google.com/download?id=1Tsjl9Vg0AeVZghPrv62wgsyuZOwJr-CT&export=download",
    "https://drive.usercontent.google.com/download?id=1W3jiG4ZznuJ-ZIRah9UVgIrYcauwQTck&export=download",
    "https://drive.usercontent.google.com/download?id=1toCEB4qn-UzwGYhv5cJmsVucFZ_H7Tkd&export=download",
    "https://drive.usercontent.google.com/download?id=1jDrLWu6myZJWDFnn8sBzbd2Si2PgivOO&export=download"
  ],
  "availableVoices": {
    "voice1": true,
    "voice2": true,
    "voice3": true,
    "all": true
  },
  "notes": [
    {
      "name": "17.jpg",
      "id": "1poJgWMdTBQJ_yb_EZUZZSiwLmwBpEibQ",
      "url": "https://lh3.googleusercontent.com/d/1poJgWMdTBQJ_yb_EZUZZSiwLmwBpEibQ",
      "viewUrl": "https://drive.google.com/file/d/1poJgWMdTBQJ_yb_EZUZZSiwLmwBpEibQ/view?usp=drivesdk"
    },
    {
      "name": "18.jpg",
      "id": "1GqTbRuwX5KC4arkUADgoDBMD5b63KPP8",
      "url": "https://lh3.googleusercontent.com/d/1GqTbRuwX5KC4arkUADgoDBMD5b63KPP8",
      "viewUrl": "https://drive.google.com/file/d/1GqTbRuwX5KC4arkUADgoDBMD5b63KPP8/view?usp=drivesdk"
    }
  ]
},
  "6.1": {
  "key": "6.1",
  "title": "6.1 უფალო აცხოვნე",
  "folderId": "1sxKqNKnVbZmUokJvSOnFEaXQZ4Aehs_X",
  "folderUrl": "https://drive.google.com/drive/folders/1sxKqNKnVbZmUokJvSOnFEaXQZ4Aehs_X",
  "voice1Url": "https://drive.usercontent.google.com/download?id=1AjsuX7ezZYI15IN4srUQiA47emAyDqVE&export=download",
  "voice2Url": "https://drive.usercontent.google.com/download?id=1aPJclxueFEJOmSTdoqf4Fxx7J74n5xFJ&export=download",
  "voice3Url": "https://drive.usercontent.google.com/download?id=1JerASbZ_zoVDXKjkYG3D4gKicC3ShX-B&export=download",
  "allVoicesUrl": "https://drive.usercontent.google.com/download?id=1h0W7s04ksFfwwoa-d5QzSg5nbg2nfV4q&export=download",
  "tracks": [
    "https://drive.usercontent.google.com/download?id=1AjsuX7ezZYI15IN4srUQiA47emAyDqVE&export=download",
    "https://drive.usercontent.google.com/download?id=1aPJclxueFEJOmSTdoqf4Fxx7J74n5xFJ&export=download",
    "https://drive.usercontent.google.com/download?id=1JerASbZ_zoVDXKjkYG3D4gKicC3ShX-B&export=download",
    "https://drive.usercontent.google.com/download?id=1h0W7s04ksFfwwoa-d5QzSg5nbg2nfV4q&export=download"
  ],
  "availableVoices": {
    "voice1": true,
    "voice2": true,
    "voice3": true,
    "all": true
  },
  "notes": [
    {
      "name": "Screenshot 2025-08-12 014548.png",
      "id": "1-Yd6r2XwtoWUvcPJEbokr7cn3lGmZ3R9",
      "url": "https://lh3.googleusercontent.com/d/1-Yd6r2XwtoWUvcPJEbokr7cn3lGmZ3R9",
      "viewUrl": "https://drive.google.com/file/d/1-Yd6r2XwtoWUvcPJEbokr7cn3lGmZ3R9/view?usp=drivesdk"
    }
  ]
},
  "7": {
  "key": "7",
  "title": "7. გ.ს წმიდაო ღმერთო",
  "folderId": "13mzM13nxhCeTJ43TiuboJSdN0ltjhL6f",
  "folderUrl": "https://drive.google.com/drive/folders/13mzM13nxhCeTJ43TiuboJSdN0ltjhL6f",
  "voice1Url": "/audio/wmidao-ghmerto/voice1.mp3",
  "voice2Url": "/audio/wmidao-ghmerto/voice2.mp3",
  "voice3Url": "/audio/wmidao-ghmerto/voice3.mp3",
  "allVoicesUrl": "/audio/wmidao-ghmerto/all_voices.mp3",
  "tracks": [
    "/audio/wmidao-ghmerto/voice1.mp3",
    "/audio/wmidao-ghmerto/voice2.mp3",
    "/audio/wmidao-ghmerto/voice3.mp3",
    "/audio/wmidao-ghmerto/all_voices.mp3"
  ],
  "availableVoices": {
    "voice1": true,
    "voice2": true,
    "voice3": true,
    "all": true
  },
  "notes": [
    {
      "name": "254.jpg",
      "id": "1DwlmK9IcBnDUv6YvPK3mZVvRetCkj9yp",
      "url": "https://lh3.googleusercontent.com/d/1DwlmK9IcBnDUv6YvPK3mZVvRetCkj9yp",
      "viewUrl": "https://drive.google.com/file/d/1DwlmK9IcBnDUv6YvPK3mZVvRetCkj9yp/view?usp=drivesdk"
    },
    {
      "name": "255.jpg",
      "id": "1fqcPHKlZdALgWlMS5KHajeQNzs6dAVjJ",
      "url": "https://lh3.googleusercontent.com/d/1fqcPHKlZdALgWlMS5KHajeQNzs6dAVjJ",
      "viewUrl": "https://drive.google.com/file/d/1fqcPHKlZdALgWlMS5KHajeQNzs6dAVjJ/view?usp=drivesdk"
    }
  ],
  "lyrics": "წმიდაო ღმერთო,\nწმიდაო ძლიერო,\nწმიდაო უკვდავო,\nშეგვიწყალენ ჩვენ.",
  "duration": 100
},
  "8": {
  "key": "8",
  "title": "8. გ.ს ალილუია",
  "folderId": "117xeGQExS2WiWgVdq5aIGHldjv_bji9C",
  "folderUrl": "https://drive.google.com/drive/folders/117xeGQExS2WiWgVdq5aIGHldjv_bji9C",
  "voice1Url": "https://drive.usercontent.google.com/download?id=1BwPBYTiVRGDQNi6p2nhWzd7x9qVQi14t&export=download",
  "voice2Url": "https://drive.usercontent.google.com/download?id=1mOVRzjU_1E-ROCM9O62LIDtwbOSWJE3g&export=download",
  "voice3Url": "https://drive.usercontent.google.com/download?id=1emNfdLjwKaI1EhYPZv9PyY9ndZ3m0B1z&export=download",
  "allVoicesUrl": "https://drive.usercontent.google.com/download?id=1tijMGvkl3DZcbvp22vC_EKKw4KkSGTE4&export=download",
  "tracks": [
    "https://drive.usercontent.google.com/download?id=1BwPBYTiVRGDQNi6p2nhWzd7x9qVQi14t&export=download",
    "https://drive.usercontent.google.com/download?id=1mOVRzjU_1E-ROCM9O62LIDtwbOSWJE3g&export=download",
    "https://drive.usercontent.google.com/download?id=1emNfdLjwKaI1EhYPZv9PyY9ndZ3m0B1z&export=download",
    "https://drive.usercontent.google.com/download?id=1tijMGvkl3DZcbvp22vC_EKKw4KkSGTE4&export=download"
  ],
  "availableVoices": {
    "voice1": true,
    "voice2": true,
    "voice3": true,
    "all": true
  },
  "notes": [
    {
      "name": "261.jpg",
      "id": "1101RJo9t8zJLBXAanl1q8bibbi-eGJhi",
      "url": "https://lh3.googleusercontent.com/d/1101RJo9t8zJLBXAanl1q8bibbi-eGJhi",
      "viewUrl": "https://drive.google.com/file/d/1101RJo9t8zJLBXAanl1q8bibbi-eGJhi/view?usp=drivesdk"
    }
  ]
},
  "8.0": {
  "key": "8.0",
  "title": "8.0 გ.ს წარდგომა",
  "folderId": "1PWdqkehskQUO86ZWfouueL5cCZsvqM94",
  "folderUrl": "https://drive.google.com/drive/folders/1PWdqkehskQUO86ZWfouueL5cCZsvqM94",
  "voice1Url": "",
  "voice2Url": "",
  "voice3Url": "",
  "allVoicesUrl": "",
  "tracks": [
    "",
    "",
    "",
    ""
  ],
  "availableVoices": {
    "voice1": false,
    "voice2": false,
    "voice3": false,
    "all": false
  },
  "notes": [
    {
      "name": "25.1.jpg",
      "id": "1yBXQ6rc-rCwT4CFSEt_DOXBhHz8Oo9fY",
      "url": "https://lh3.googleusercontent.com/d/1yBXQ6rc-rCwT4CFSEt_DOXBhHz8Oo9fY",
      "viewUrl": "https://drive.google.com/file/d/1yBXQ6rc-rCwT4CFSEt_DOXBhHz8Oo9fY/view?usp=drivesdk"
    }
  ],
  "videoUrl": "https://drive.google.com/file/d/1tbSHWdfHWf8Op-oCBsjjZoetS0cpT0m9/view?usp=drivesdk"
},
  "8.1": {
  "key": "8.1",
  "title": "8.1. დასულისაცა  3",
  "folderId": "17ukJDCVLQLHioFrvycMt10HhqRXA9fU_",
  "folderUrl": "https://drive.google.com/drive/folders/17ukJDCVLQLHioFrvycMt10HhqRXA9fU_",
  "voice1Url": "https://drive.usercontent.google.com/download?id=1iQ7MT7dGyE4TPa3dATGANC85X80SF4xx&export=download",
  "voice2Url": "https://drive.usercontent.google.com/download?id=17JUUWfmkALKQB39Ml8vslTfu6D1uJdQJ&export=download",
  "voice3Url": "https://drive.usercontent.google.com/download?id=1G__e92R34TR03J7SpQgXvjO6av3lblOI&export=download",
  "allVoicesUrl": "https://drive.usercontent.google.com/download?id=1HDAV1ZUDiIhr88YKcAL8qRTdRG-GF7sT&export=download",
  "tracks": [
    "https://drive.usercontent.google.com/download?id=1iQ7MT7dGyE4TPa3dATGANC85X80SF4xx&export=download",
    "https://drive.usercontent.google.com/download?id=17JUUWfmkALKQB39Ml8vslTfu6D1uJdQJ&export=download",
    "https://drive.usercontent.google.com/download?id=1G__e92R34TR03J7SpQgXvjO6av3lblOI&export=download",
    "https://drive.usercontent.google.com/download?id=1HDAV1ZUDiIhr88YKcAL8qRTdRG-GF7sT&export=download"
  ],
  "availableVoices": {
    "voice1": true,
    "voice2": true,
    "voice3": true,
    "all": true
  },
  "notes": [
    {
      "name": "276.jpg",
      "id": "1QGwVmhiexzlHGFGHiROzB9UmYYFNmIwW",
      "url": "https://lh3.googleusercontent.com/d/1QGwVmhiexzlHGFGHiROzB9UmYYFNmIwW",
      "viewUrl": "https://drive.google.com/file/d/1QGwVmhiexzlHGFGHiROzB9UmYYFNmIwW/view?usp=drivesdk"
    }
  ]
},
  "8.2": {
  "key": "8.2",
  "title": "8.2 და სულისაცა",
  "folderId": "1Q42NkSAY-Uwkdoak6IWfLD2LpN1AiwJU",
  "folderUrl": "https://drive.google.com/drive/folders/1Q42NkSAY-Uwkdoak6IWfLD2LpN1AiwJU",
  "voice1Url": "https://drive.usercontent.google.com/download?id=1jXKDsCOOiOQtRhtLKHtmt7m3ihwcl-Ac&export=download",
  "voice2Url": "https://drive.usercontent.google.com/download?id=1mZxbwngCLuUH6sdVa1Bxtg_pJGS0e4RD&export=download",
  "voice3Url": "https://drive.usercontent.google.com/download?id=1tyCCzQ88eGTx5Xz1RiOP6NQ6s8z3IGwO&export=download",
  "allVoicesUrl": "https://drive.usercontent.google.com/download?id=1xTPkQXcoGCMnZT4gBqQFWNDUS02e3pi2&export=download",
  "tracks": [
    "https://drive.usercontent.google.com/download?id=1jXKDsCOOiOQtRhtLKHtmt7m3ihwcl-Ac&export=download",
    "https://drive.usercontent.google.com/download?id=1mZxbwngCLuUH6sdVa1Bxtg_pJGS0e4RD&export=download",
    "https://drive.usercontent.google.com/download?id=1tyCCzQ88eGTx5Xz1RiOP6NQ6s8z3IGwO&export=download",
    "https://drive.usercontent.google.com/download?id=1xTPkQXcoGCMnZT4gBqQFWNDUS02e3pi2&export=download"
  ],
  "availableVoices": {
    "voice1": true,
    "voice2": true,
    "voice3": true,
    "all": true
  },
  "notes": [
    {
      "name": "264.jpg",
      "id": "1nzNW_fo-pq7X3rZLmMtu6asCm6N8IZnJ",
      "url": "https://lh3.googleusercontent.com/d/1nzNW_fo-pq7X3rZLmMtu6asCm6N8IZnJ",
      "viewUrl": "https://drive.google.com/file/d/1nzNW_fo-pq7X3rZLmMtu6asCm6N8IZnJ/view?usp=drivesdk"
    }
  ]
},
  "9": {
  "key": "9",
  "title": "9. გ.ს ალილუია 2",
  "folderId": "18Vg2Woanduzvls8N5fi4Z5OEisqFiYMn",
  "folderUrl": "https://drive.google.com/drive/folders/18Vg2Woanduzvls8N5fi4Z5OEisqFiYMn",
  "voice1Url": "https://drive.usercontent.google.com/download?id=1ILYlTdz-MvaWT0cvlZfnm1lpJa34ItFW&export=download",
  "voice2Url": "https://drive.usercontent.google.com/download?id=188X1OtIZKuS94vnn2nRk2M8opBMzFZLw&export=download",
  "voice3Url": "https://drive.usercontent.google.com/download?id=18fLeMnvdBljizUuIgoANpU-xHwPEFgnU&export=download",
  "allVoicesUrl": "https://drive.usercontent.google.com/download?id=1NFHJ5nrPQ2hrFNdvEmO772QgELWoNCBT&export=download",
  "tracks": [
    "https://drive.usercontent.google.com/download?id=1ILYlTdz-MvaWT0cvlZfnm1lpJa34ItFW&export=download",
    "https://drive.usercontent.google.com/download?id=188X1OtIZKuS94vnn2nRk2M8opBMzFZLw&export=download",
    "https://drive.usercontent.google.com/download?id=18fLeMnvdBljizUuIgoANpU-xHwPEFgnU&export=download",
    "https://drive.usercontent.google.com/download?id=1NFHJ5nrPQ2hrFNdvEmO772QgELWoNCBT&export=download"
  ],
  "availableVoices": {
    "voice1": true,
    "voice2": true,
    "voice3": true,
    "all": true
  },
  "notes": [
    {
      "name": "309.jpg",
      "id": "17RM86d2fDH6JUUuW0EAB2NAd7Y4HIjyG",
      "url": "https://lh3.googleusercontent.com/d/17RM86d2fDH6JUUuW0EAB2NAd7Y4HIjyG",
      "viewUrl": "https://drive.google.com/file/d/17RM86d2fDH6JUUuW0EAB2NAd7Y4HIjyG/view?usp=drivesdk"
    }
  ]
},
  "9.1": {
  "key": "9.1",
  "title": "9.1 გ.ს. მიცვალებულთა კვერექსი",
  "folderId": "1w9-NvziJg54ZeygwxPvtQz-lB9MwI90A",
  "folderUrl": "https://drive.google.com/drive/folders/1w9-NvziJg54ZeygwxPvtQz-lB9MwI90A",
  "voice1Url": "https://drive.usercontent.google.com/download?id=1XYwqLfuJOrdKOPBN1GqxxkUiqLomBvV5&export=download",
  "voice2Url": "https://drive.usercontent.google.com/download?id=1dAn63jcTZedmv_ly6_bPIw8MyH-ebO8x&export=download",
  "voice3Url": "https://drive.usercontent.google.com/download?id=1VCoJ_qxa2ITVIo458TY3H5mOa0ABOI8v&export=download",
  "allVoicesUrl": "https://drive.usercontent.google.com/download?id=1XYwqLfuJOrdKOPBN1GqxxkUiqLomBvV5&export=download",
  "tracks": [
    "https://drive.usercontent.google.com/download?id=1XYwqLfuJOrdKOPBN1GqxxkUiqLomBvV5&export=download",
    "https://drive.usercontent.google.com/download?id=1dAn63jcTZedmv_ly6_bPIw8MyH-ebO8x&export=download",
    "https://drive.usercontent.google.com/download?id=1VCoJ_qxa2ITVIo458TY3H5mOa0ABOI8v&export=download",
    "https://drive.usercontent.google.com/download?id=1XYwqLfuJOrdKOPBN1GqxxkUiqLomBvV5&export=download"
  ],
  "availableVoices": {
    "voice1": true,
    "voice2": true,
    "voice3": true,
    "all": true
  },
  "notes": [
    {
      "name": "265.jpg",
      "id": "1FAyM3KlGr_s-ecD4Lf1s7gkFCjhLQz2b",
      "url": "https://lh3.googleusercontent.com/d/1FAyM3KlGr_s-ecD4Lf1s7gkFCjhLQz2b",
      "viewUrl": "https://drive.google.com/file/d/1FAyM3KlGr_s-ecD4Lf1s7gkFCjhLQz2b/view?usp=drivesdk"
    }
  ]
},
  "10": {
  "key": "10",
  "title": "10. გ.ს. ქერუბიმთა",
  "folderId": "1ZYhrq3gijUlC4_sjpPaNDyH0K1VA0UqA",
  "folderUrl": "https://drive.google.com/drive/folders/1ZYhrq3gijUlC4_sjpPaNDyH0K1VA0UqA",
  "voice1Url": "https://drive.usercontent.google.com/download?id=1XAiObNCbA4RjQkvwzogiTYJmXpKN4CyM&export=download",
  "voice2Url": "https://drive.usercontent.google.com/download?id=1MtwIwsno1xDt9cZqcGg63SCcVib1dedi&export=download",
  "voice3Url": "https://drive.usercontent.google.com/download?id=1KbFLovCz8qoWTwi9zwSnv3YgcboLiC7r&export=download",
  "allVoicesUrl": "https://drive.usercontent.google.com/download?id=1VcSf0bSyB4O1eDkCcA-xwrY6fmMZRppg&export=download",
  "tracks": [
    "https://drive.usercontent.google.com/download?id=1XAiObNCbA4RjQkvwzogiTYJmXpKN4CyM&export=download",
    "https://drive.usercontent.google.com/download?id=1MtwIwsno1xDt9cZqcGg63SCcVib1dedi&export=download",
    "https://drive.usercontent.google.com/download?id=1KbFLovCz8qoWTwi9zwSnv3YgcboLiC7r&export=download",
    "https://drive.usercontent.google.com/download?id=1VcSf0bSyB4O1eDkCcA-xwrY6fmMZRppg&export=download"
  ],
  "availableVoices": {
    "voice1": true,
    "voice2": true,
    "voice3": true,
    "all": true
  },
  "notes": [
    {
      "name": "28.JPG",
      "id": "14XPqhW6F8_aUbZq4A6Yp3T44uWlp7Jp1",
      "url": "https://lh3.googleusercontent.com/d/14XPqhW6F8_aUbZq4A6Yp3T44uWlp7Jp1",
      "viewUrl": "https://drive.google.com/file/d/14XPqhW6F8_aUbZq4A6Yp3T44uWlp7Jp1/view?usp=drivesdk"
    },
    {
      "name": "29.JPG",
      "id": "12jxc5ZpF8dbHCm5P1vT3efv6pmL8XyM2",
      "url": "https://lh3.googleusercontent.com/d/12jxc5ZpF8dbHCm5P1vT3efv6pmL8XyM2",
      "viewUrl": "https://drive.google.com/file/d/12jxc5ZpF8dbHCm5P1vT3efv6pmL8XyM2/view?usp=drivesdk"
    },
    {
      "name": "30.JPG",
      "id": "1oYEynmXxSxJhCvD55dJ4OCSvUnWfQWRw",
      "url": "https://lh3.googleusercontent.com/d/1oYEynmXxSxJhCvD55dJ4OCSvUnWfQWRw",
      "viewUrl": "https://drive.google.com/file/d/1oYEynmXxSxJhCvD55dJ4OCSvUnWfQWRw/view?usp=drivesdk"
    },
    {
      "name": "31.JPG",
      "id": "1T0tPK6e9f4oz5GyUyLhO4DFquEW8Lm88",
      "url": "https://lh3.googleusercontent.com/d/1T0tPK6e9f4oz5GyUyLhO4DFquEW8Lm88",
      "viewUrl": "https://drive.google.com/file/d/1T0tPK6e9f4oz5GyUyLhO4DFquEW8Lm88/view?usp=drivesdk"
    }
  ]
},
  "10.1": {
  "key": "10.1",
  "title": "10.1 გ.ს .ქერუბიმთა (გამშვენებული",
  "folderId": "1f9lhHxm8qE97LUKj9mrMaWRI5G6RwZg0",
  "folderUrl": "https://drive.google.com/drive/folders/1f9lhHxm8qE97LUKj9mrMaWRI5G6RwZg0",
  "voice1Url": "https://drive.usercontent.google.com/download?id=18fQJBMdEx2LYsQRIcIjTU83gYKQmKmlN&export=download",
  "voice2Url": "https://drive.usercontent.google.com/download?id=1EfjnRLnCMjz1oRM0UiHitR-1S5XxGxio&export=download",
  "voice3Url": "https://drive.usercontent.google.com/download?id=1Q1gt2ZDxsGVFj5lVe1ttTLAggej6YVDb&export=download",
  "allVoicesUrl": "https://drive.usercontent.google.com/download?id=1aVraUqevIA0rgbHyqdlNUQ7CE2q1Boc5&export=download",
  "tracks": [
    "https://drive.usercontent.google.com/download?id=18fQJBMdEx2LYsQRIcIjTU83gYKQmKmlN&export=download",
    "https://drive.usercontent.google.com/download?id=1EfjnRLnCMjz1oRM0UiHitR-1S5XxGxio&export=download",
    "https://drive.usercontent.google.com/download?id=1Q1gt2ZDxsGVFj5lVe1ttTLAggej6YVDb&export=download",
    "https://drive.usercontent.google.com/download?id=1aVraUqevIA0rgbHyqdlNUQ7CE2q1Boc5&export=download"
  ],
  "availableVoices": {
    "voice1": true,
    "voice2": true,
    "voice3": true,
    "all": true
  },
  "notes": [
    {
      "name": "267.jpg",
      "id": "1yHhwVNhx6I22sAgP43rmtWyoWLb5_b9V",
      "url": "https://lh3.googleusercontent.com/d/1yHhwVNhx6I22sAgP43rmtWyoWLb5_b9V",
      "viewUrl": "https://drive.google.com/file/d/1yHhwVNhx6I22sAgP43rmtWyoWLb5_b9V/view?usp=drivesdk"
    },
    {
      "name": "268.jpg",
      "id": "1M_B2xcptXlRVQOD3M91shCpzG9yPmGIC",
      "url": "https://lh3.googleusercontent.com/d/1M_B2xcptXlRVQOD3M91shCpzG9yPmGIC",
      "viewUrl": "https://drive.google.com/file/d/1M_B2xcptXlRVQOD3M91shCpzG9yPmGIC/view?usp=drivesdk"
    }
  ]
},
  "11": {
  "key": "11",
  "title": "11. და ვითარცა",
  "folderId": "1HMKHV1bqT2D7ldG15Hk10LUWHfR1qPua",
  "folderUrl": "https://drive.google.com/drive/folders/1HMKHV1bqT2D7ldG15Hk10LUWHfR1qPua",
  "voice1Url": "https://drive.usercontent.google.com/download?id=1sgkXbL4-ayL4ovYcOaPsW8zn200uqpYj&export=download",
  "voice2Url": "https://drive.usercontent.google.com/download?id=1eary19n_ZFdL50zYS0je5eHwetGE1lkJ&export=download",
  "voice3Url": "https://drive.usercontent.google.com/download?id=1gya8pNVLl9rAvjVVbzaX159Bd7YB9cE5&export=download",
  "allVoicesUrl": "https://drive.usercontent.google.com/download?id=1kyYd188OJb2iFpKW0FrAJpti-OPoL6JJ&export=download",
  "tracks": [
    "https://drive.usercontent.google.com/download?id=1sgkXbL4-ayL4ovYcOaPsW8zn200uqpYj&export=download",
    "https://drive.usercontent.google.com/download?id=1eary19n_ZFdL50zYS0je5eHwetGE1lkJ&export=download",
    "https://drive.usercontent.google.com/download?id=1gya8pNVLl9rAvjVVbzaX159Bd7YB9cE5&export=download",
    "https://drive.usercontent.google.com/download?id=1kyYd188OJb2iFpKW0FrAJpti-OPoL6JJ&export=download"
  ],
  "availableVoices": {
    "voice1": true,
    "voice2": true,
    "voice3": true,
    "all": true
  },
  "notes": [
    {
      "name": "273.jpg",
      "id": "1Yn5CEBhngZ9Gt4401FjWnK9okjQpOfaB",
      "url": "https://lh3.googleusercontent.com/d/1Yn5CEBhngZ9Gt4401FjWnK9okjQpOfaB",
      "viewUrl": "https://drive.google.com/file/d/1Yn5CEBhngZ9Gt4401FjWnK9okjQpOfaB/view?usp=drivesdk"
    }
  ]
},
  "12": {
  "key": "12",
  "title": "12. გ,ს მამასა და ძესა.",
  "folderId": "1qFmTSQXVHytbLPsgrafSrJr-B-3Qjw2y",
  "folderUrl": "https://drive.google.com/drive/folders/1qFmTSQXVHytbLPsgrafSrJr-B-3Qjw2y",
  "voice1Url": "https://drive.usercontent.google.com/download?id=1GgIpCRbcC55UuZv18IZdgcioyFWZG_TU&export=download",
  "voice2Url": "https://drive.usercontent.google.com/download?id=1YRtmsRGH353ZfK8sM0oFBaL2PGl1mngn&export=download",
  "voice3Url": "https://drive.usercontent.google.com/download?id=19XNSr61ixZJbFJcpusrl-mttCJsn8MmE&export=download",
  "allVoicesUrl": "https://drive.usercontent.google.com/download?id=1Uezmaa057gAb5WkjYpUqYEpxGC-mWl82&export=download",
  "tracks": [
    "https://drive.usercontent.google.com/download?id=1GgIpCRbcC55UuZv18IZdgcioyFWZG_TU&export=download",
    "https://drive.usercontent.google.com/download?id=1YRtmsRGH353ZfK8sM0oFBaL2PGl1mngn&export=download",
    "https://drive.usercontent.google.com/download?id=19XNSr61ixZJbFJcpusrl-mttCJsn8MmE&export=download",
    "https://drive.usercontent.google.com/download?id=1Uezmaa057gAb5WkjYpUqYEpxGC-mWl82&export=download"
  ],
  "availableVoices": {
    "voice1": true,
    "voice2": true,
    "voice3": true,
    "all": true
  },
  "notes": [
    {
      "name": "38.jpg",
      "id": "1We2TktURGhpzk8YaBPTto6c9pbl0u0WT",
      "url": "https://lh3.googleusercontent.com/d/1We2TktURGhpzk8YaBPTto6c9pbl0u0WT",
      "viewUrl": "https://drive.google.com/file/d/1We2TktURGhpzk8YaBPTto6c9pbl0u0WT/view?usp=drivesdk"
    }
  ]
},
  "13": {
  "key": "13",
  "title": "13. გ.ს. მრწამს ერთი ღმერთი",
  "folderId": "1kPZ3eJcOXGXrSBR-10PVC7HzdJpX52x1",
  "folderUrl": "https://drive.google.com/drive/folders/1kPZ3eJcOXGXrSBR-10PVC7HzdJpX52x1",
  "voice1Url": "https://drive.usercontent.google.com/download?id=1FqZJGz_GkUjhWQJ-VM0b_Wi99LuCzii5&export=download",
  "voice2Url": "https://drive.usercontent.google.com/download?id=1Yk8WDaWwV1Of0Z9o-9tZG29LAkLqCoXH&export=download",
  "voice3Url": "https://drive.usercontent.google.com/download?id=1BuIwthvWWKa9G-wJ0zFHgqx-ob9SGPaW&export=download",
  "allVoicesUrl": "https://drive.usercontent.google.com/download?id=1yV7gRl98LpQ0wJxhKQvJqREGFwHmrHbj&export=download",
  "tracks": [
    "https://drive.usercontent.google.com/download?id=1FqZJGz_GkUjhWQJ-VM0b_Wi99LuCzii5&export=download",
    "https://drive.usercontent.google.com/download?id=1Yk8WDaWwV1Of0Z9o-9tZG29LAkLqCoXH&export=download",
    "https://drive.usercontent.google.com/download?id=1BuIwthvWWKa9G-wJ0zFHgqx-ob9SGPaW&export=download",
    "https://drive.usercontent.google.com/download?id=1yV7gRl98LpQ0wJxhKQvJqREGFwHmrHbj&export=download"
  ],
  "availableVoices": {
    "voice1": true,
    "voice2": true,
    "voice3": true,
    "all": true
  },
  "notes": [
    {
      "name": "278.jpg",
      "id": "1_2QmxdQRruLsinlYNRjh7tnt3zR8KOOX",
      "url": "https://lh3.googleusercontent.com/d/1_2QmxdQRruLsinlYNRjh7tnt3zR8KOOX",
      "viewUrl": "https://drive.google.com/file/d/1_2QmxdQRruLsinlYNRjh7tnt3zR8KOOX/view?usp=drivesdk"
    },
    {
      "name": "279.jpg",
      "id": "1qv_2D4wc2XATjtoNez3AG0kujeydS9Vo",
      "url": "https://lh3.googleusercontent.com/d/1qv_2D4wc2XATjtoNez3AG0kujeydS9Vo",
      "viewUrl": "https://drive.google.com/file/d/1qv_2D4wc2XATjtoNez3AG0kujeydS9Vo/view?usp=drivesdk"
    },
    {
      "name": "280.jpg",
      "id": "1jcQVN0oB9mr0fykjMnLDzModhTprUv1S",
      "url": "https://lh3.googleusercontent.com/d/1jcQVN0oB9mr0fykjMnLDzModhTprUv1S",
      "viewUrl": "https://drive.google.com/file/d/1jcQVN0oB9mr0fykjMnLDzModhTprUv1S/view?usp=drivesdk"
    },
    {
      "name": "281.jpg",
      "id": "1j3mPfvA6rAtXWKO0omYGRiRLgtmDa66J",
      "url": "https://lh3.googleusercontent.com/d/1j3mPfvA6rAtXWKO0omYGRiRLgtmDa66J",
      "viewUrl": "https://drive.google.com/file/d/1j3mPfvA6rAtXWKO0omYGRiRLgtmDa66J/view?usp=drivesdk"
    },
    {
      "name": "282.jpg",
      "id": "1wf1d0cSxHNbFXr_98H6A9iFelLExkTBa",
      "url": "https://lh3.googleusercontent.com/d/1wf1d0cSxHNbFXr_98H6A9iFelLExkTBa",
      "viewUrl": "https://drive.google.com/file/d/1wf1d0cSxHNbFXr_98H6A9iFelLExkTBa/view?usp=drivesdk"
    },
    {
      "name": "283.jpg",
      "id": "1OrQhg0Wh7ZJk1PC4Kfv61e-NICYcLO3Y",
      "url": "https://lh3.googleusercontent.com/d/1OrQhg0Wh7ZJk1PC4Kfv61e-NICYcLO3Y",
      "viewUrl": "https://drive.google.com/file/d/1OrQhg0Wh7ZJk1PC4Kfv61e-NICYcLO3Y/view?usp=drivesdk"
    }
  ]
},
  "14": {
  "key": "14",
  "title": "14. გ.ს ღირს არს და მართალ",
  "folderId": "1SmDmru_KNHVa5tEloYI_U9HTvRDtxqzS",
  "folderUrl": "https://drive.google.com/drive/folders/1SmDmru_KNHVa5tEloYI_U9HTvRDtxqzS",
  "voice1Url": "https://drive.usercontent.google.com/download?id=1mOzlfGQI0csLaiBptgWFIHdBEx90Cpha&export=download",
  "voice2Url": "https://drive.usercontent.google.com/download?id=1UVa7txAm_mvi1QrL20OWhcEX8h61Ovzi&export=download",
  "voice3Url": "https://drive.usercontent.google.com/download?id=1Bbd1bylSLSwO8PUg1JPOusWNdcQXIFRH&export=download",
  "allVoicesUrl": "https://drive.usercontent.google.com/download?id=1wpkUNomF9W9PsnbHyOmYUfTh7ksz6ZRf&export=download",
  "tracks": [
    "https://drive.usercontent.google.com/download?id=1mOzlfGQI0csLaiBptgWFIHdBEx90Cpha&export=download",
    "https://drive.usercontent.google.com/download?id=1UVa7txAm_mvi1QrL20OWhcEX8h61Ovzi&export=download",
    "https://drive.usercontent.google.com/download?id=1Bbd1bylSLSwO8PUg1JPOusWNdcQXIFRH&export=download",
    "https://drive.usercontent.google.com/download?id=1wpkUNomF9W9PsnbHyOmYUfTh7ksz6ZRf&export=download"
  ],
  "availableVoices": {
    "voice1": true,
    "voice2": true,
    "voice3": true,
    "all": true
  },
  "notes": [
    {
      "name": "44.jpg",
      "id": "1JxtD8BTK7bwdbxVWRCr2mQKBiLn3HhW-",
      "url": "https://lh3.googleusercontent.com/d/1JxtD8BTK7bwdbxVWRCr2mQKBiLn3HhW-",
      "viewUrl": "https://drive.google.com/file/d/1JxtD8BTK7bwdbxVWRCr2mQKBiLn3HhW-/view?usp=drivesdk"
    }
  ]
},
  "14.1": {
  "key": "14.1",
  "title": "14.1 გ.ს. გვაქვს უფლისა მიმართ",
  "folderId": "18YzxRntIdw35el0McHMZNrmg_mH61jUL",
  "folderUrl": "https://drive.google.com/drive/folders/18YzxRntIdw35el0McHMZNrmg_mH61jUL",
  "voice1Url": "https://drive.usercontent.google.com/download?id=1x2-W5G33ElnaZ0Ak6KWl6B4rqyFTsi8Z&export=download",
  "voice2Url": "https://drive.usercontent.google.com/download?id=1eRljnrwvWWLv-0eC6-kwCHI2kdA_GDzv&export=download",
  "voice3Url": "https://drive.usercontent.google.com/download?id=1wnKe_2BZo4haSWGa9cojGzQ1esq5n7vf&export=download",
  "allVoicesUrl": "https://drive.usercontent.google.com/download?id=1rocuMXnjthx1n98f2ZaFkrBuo2eUJ6kL&export=download",
  "tracks": [
    "https://drive.usercontent.google.com/download?id=1x2-W5G33ElnaZ0Ak6KWl6B4rqyFTsi8Z&export=download",
    "https://drive.usercontent.google.com/download?id=1eRljnrwvWWLv-0eC6-kwCHI2kdA_GDzv&export=download",
    "https://drive.usercontent.google.com/download?id=1wnKe_2BZo4haSWGa9cojGzQ1esq5n7vf&export=download",
    "https://drive.usercontent.google.com/download?id=1rocuMXnjthx1n98f2ZaFkrBuo2eUJ6kL&export=download"
  ],
  "availableVoices": {
    "voice1": true,
    "voice2": true,
    "voice3": true,
    "all": true
  },
  "notes": []
},
  "14.2": {
  "key": "14.2",
  "title": "14.2. გ.ს. წყალობა მშივდოა შესაწირავი ქებისა",
  "folderId": "1_QwJVfgpfuk-hBcirsM4UIxxIyva1Nst",
  "folderUrl": "https://drive.google.com/drive/folders/1_QwJVfgpfuk-hBcirsM4UIxxIyva1Nst",
  "voice1Url": "https://drive.usercontent.google.com/download?id=1HlX3vcbMvSdT-OiOj7bg5d8wS-DmAhSl&export=download",
  "voice2Url": "https://drive.usercontent.google.com/download?id=1U_bzooq9O5wLPxQyYbUmKycgLXhYeGRp&export=download",
  "voice3Url": "https://drive.usercontent.google.com/download?id=1Id8E_3fJ0Y0QEAMYT6QZui8oViTc_tZQ&export=download",
  "allVoicesUrl": "https://drive.usercontent.google.com/download?id=1Pr34XEtfirimYllHVENperRW0Wpb2iCP&export=download",
  "tracks": [
    "https://drive.usercontent.google.com/download?id=1HlX3vcbMvSdT-OiOj7bg5d8wS-DmAhSl&export=download",
    "https://drive.usercontent.google.com/download?id=1U_bzooq9O5wLPxQyYbUmKycgLXhYeGRp&export=download",
    "https://drive.usercontent.google.com/download?id=1Id8E_3fJ0Y0QEAMYT6QZui8oViTc_tZQ&export=download",
    "https://drive.usercontent.google.com/download?id=1Pr34XEtfirimYllHVENperRW0Wpb2iCP&export=download"
  ],
  "availableVoices": {
    "voice1": true,
    "voice2": true,
    "voice3": true,
    "all": true
  },
  "notes": [
    {
      "name": "284.jpg",
      "id": "1VboJowCvoWzZ8g5tOlN8km26M4iW_7km",
      "url": "https://lh3.googleusercontent.com/d/1VboJowCvoWzZ8g5tOlN8km26M4iW_7km",
      "viewUrl": "https://drive.google.com/file/d/1VboJowCvoWzZ8g5tOlN8km26M4iW_7km/view?usp=drivesdk"
    }
  ]
},
  "15": {
  "key": "15",
  "title": "15 გ.ს  წმიდა არს",
  "folderId": "1rOTFn50yQVBiEnJnNFvCd59Yv67qFJQN",
  "folderUrl": "https://drive.google.com/drive/folders/1rOTFn50yQVBiEnJnNFvCd59Yv67qFJQN",
  "voice1Url": "https://drive.usercontent.google.com/download?id=1VVzsjxUy5vfpeMRSBQfoH3HKUJuHSY1C&export=download",
  "voice2Url": "https://drive.usercontent.google.com/download?id=1rUy0TAkC178JcWbQrWaeuZlDSLR7MEvU&export=download",
  "voice3Url": "https://drive.usercontent.google.com/download?id=10VvfUWIbdb8wJkiD3wnqwVhyDVeT8uZa&export=download",
  "allVoicesUrl": "https://drive.usercontent.google.com/download?id=13YnQd4q_v7d_i4gycvg_bzjsSbs3b3HD&export=download",
  "tracks": [
    "https://drive.usercontent.google.com/download?id=1VVzsjxUy5vfpeMRSBQfoH3HKUJuHSY1C&export=download",
    "https://drive.usercontent.google.com/download?id=1rUy0TAkC178JcWbQrWaeuZlDSLR7MEvU&export=download",
    "https://drive.usercontent.google.com/download?id=10VvfUWIbdb8wJkiD3wnqwVhyDVeT8uZa&export=download",
    "https://drive.usercontent.google.com/download?id=13YnQd4q_v7d_i4gycvg_bzjsSbs3b3HD&export=download"
  ],
  "availableVoices": {
    "voice1": true,
    "voice2": true,
    "voice3": true,
    "all": true
  },
  "notes": [
    {
      "name": "45.jpg",
      "id": "1A1ZknGCJFAzRBgh5jMWurlvX0Kxd_hfK",
      "url": "https://lh3.googleusercontent.com/d/1A1ZknGCJFAzRBgh5jMWurlvX0Kxd_hfK",
      "viewUrl": "https://drive.google.com/file/d/1A1ZknGCJFAzRBgh5jMWurlvX0Kxd_hfK/view?usp=drivesdk"
    }
  ]
},
  "16": {
  "key": "16",
  "title": "16. გ.ს შენ გიგალობთ",
  "folderId": "1eBXH0rkQgmkoNIMORjtN7jV7GRSl53LK",
  "folderUrl": "https://drive.google.com/drive/folders/1eBXH0rkQgmkoNIMORjtN7jV7GRSl53LK",
  "voice1Url": "https://drive.usercontent.google.com/download?id=1j4ikX-aKFfq1qAdYmQG5XSdBN834P5_T&export=download",
  "voice2Url": "https://drive.usercontent.google.com/download?id=1MODsBkeFzYUNni4r3uw1f5Q7LQgTE47I&export=download",
  "voice3Url": "https://drive.usercontent.google.com/download?id=1eTJGK2Ms_xj2NCVn7FNZN1Cokk2lwpu_&export=download",
  "allVoicesUrl": "https://drive.usercontent.google.com/download?id=1D4SzuafFtZvsme1NaZCFq_4zo3QnRvDU&export=download",
  "tracks": [
    "https://drive.usercontent.google.com/download?id=1j4ikX-aKFfq1qAdYmQG5XSdBN834P5_T&export=download",
    "https://drive.usercontent.google.com/download?id=1MODsBkeFzYUNni4r3uw1f5Q7LQgTE47I&export=download",
    "https://drive.usercontent.google.com/download?id=1eTJGK2Ms_xj2NCVn7FNZN1Cokk2lwpu_&export=download",
    "https://drive.usercontent.google.com/download?id=1D4SzuafFtZvsme1NaZCFq_4zo3QnRvDU&export=download"
  ],
  "availableVoices": {
    "voice1": true,
    "voice2": true,
    "voice3": true,
    "all": true
  },
  "notes": [
    {
      "name": "47.jpg",
      "id": "1OJnuXmTdc8wurOLaCuUo3OpESTQkRV7K",
      "url": "https://lh3.googleusercontent.com/d/1OJnuXmTdc8wurOLaCuUo3OpESTQkRV7K",
      "viewUrl": "https://drive.google.com/file/d/1OJnuXmTdc8wurOLaCuUo3OpESTQkRV7K/view?usp=drivesdk"
    }
  ]
},
  "18": {
  "key": "18",
  "title": "18. გ.ს ღირს არსი",
  "folderId": "1gjJei9yQiFZE4KY9aGSoPiJk8q-Nb_Hv",
  "folderUrl": "https://drive.google.com/drive/folders/1gjJei9yQiFZE4KY9aGSoPiJk8q-Nb_Hv",
  "voice1Url": "https://drive.usercontent.google.com/download?id=1xMnIVZ2AVYL5WSLsg0i6ovx7cUptiMz_&export=download",
  "voice2Url": "https://drive.usercontent.google.com/download?id=1eodEtAESC_koimtnYkdOFzysYCML21ve&export=download",
  "voice3Url": "https://drive.usercontent.google.com/download?id=13i_9ipbTiyDyJX3v7GqKy7yhbX5iH1xZ&export=download",
  "allVoicesUrl": "https://drive.usercontent.google.com/download?id=1cS-uVYvoJnUqXDEBtt82h8k3oECBiaGG&export=download",
  "tracks": [
    "https://drive.usercontent.google.com/download?id=1xMnIVZ2AVYL5WSLsg0i6ovx7cUptiMz_&export=download",
    "https://drive.usercontent.google.com/download?id=1eodEtAESC_koimtnYkdOFzysYCML21ve&export=download",
    "https://drive.usercontent.google.com/download?id=13i_9ipbTiyDyJX3v7GqKy7yhbX5iH1xZ&export=download",
    "https://drive.usercontent.google.com/download?id=1cS-uVYvoJnUqXDEBtt82h8k3oECBiaGG&export=download"
  ],
  "availableVoices": {
    "voice1": true,
    "voice2": true,
    "voice3": true,
    "all": true
  },
  "notes": [
    {
      "name": "298.jpg",
      "id": "1oV0DhWFqV0KR6-QxsQ83CtqG13AEKADQ",
      "url": "https://lh3.googleusercontent.com/d/1oV0DhWFqV0KR6-QxsQ83CtqG13AEKADQ",
      "viewUrl": "https://drive.google.com/file/d/1oV0DhWFqV0KR6-QxsQ83CtqG13AEKADQ/view?usp=drivesdk"
    },
    {
      "name": "299.jpg",
      "id": "1bdfuKmGvDIgZqFRHUZWWrjqT5KR9nXgH",
      "url": "https://lh3.googleusercontent.com/d/1bdfuKmGvDIgZqFRHUZWWrjqT5KR9nXgH",
      "viewUrl": "https://drive.google.com/file/d/1bdfuKmGvDIgZqFRHUZWWrjqT5KR9nXgH/view?usp=drivesdk"
    }
  ]
},
  "18.1": {
  "key": "18.1",
  "title": "18.1 გ.ს შენდამი იხარებს",
  "folderId": "1THYOZN5RsgY9QknW1sSPunIJpZNeqVnk",
  "folderUrl": "https://drive.google.com/drive/folders/1THYOZN5RsgY9QknW1sSPunIJpZNeqVnk",
  "voice1Url": "https://drive.usercontent.google.com/download?id=14mCTyz2JBCAtc8os06KTTvUws9Ba9W6_&export=download",
  "voice2Url": "https://drive.usercontent.google.com/download?id=14mCTyz2JBCAtc8os06KTTvUws9Ba9W6_&export=download",
  "voice3Url": "https://drive.usercontent.google.com/download?id=14mCTyz2JBCAtc8os06KTTvUws9Ba9W6_&export=download",
  "allVoicesUrl": "https://drive.usercontent.google.com/download?id=14mCTyz2JBCAtc8os06KTTvUws9Ba9W6_&export=download",
  "tracks": [
    "https://drive.usercontent.google.com/download?id=14mCTyz2JBCAtc8os06KTTvUws9Ba9W6_&export=download",
    "https://drive.usercontent.google.com/download?id=14mCTyz2JBCAtc8os06KTTvUws9Ba9W6_&export=download",
    "https://drive.usercontent.google.com/download?id=14mCTyz2JBCAtc8os06KTTvUws9Ba9W6_&export=download",
    "https://drive.usercontent.google.com/download?id=14mCTyz2JBCAtc8os06KTTvUws9Ba9W6_&export=download"
  ],
  "availableVoices": {
    "voice1": false,
    "voice2": false,
    "voice3": false,
    "all": true
  },
  "notes": [
    {
      "name": "68.jpg",
      "id": "1G_lruE7XPvBC_BNrtvswL6cc8dw8h_tm",
      "url": "https://lh3.googleusercontent.com/d/1G_lruE7XPvBC_BNrtvswL6cc8dw8h_tm",
      "viewUrl": "https://drive.google.com/file/d/1G_lruE7XPvBC_BNrtvswL6cc8dw8h_tm/view?usp=drivesdk"
    },
    {
      "name": "69.jpg",
      "id": "1ioCRtsuoROsKaB18XZ2e4wSqTcGAHoC1",
      "url": "https://lh3.googleusercontent.com/d/1ioCRtsuoROsKaB18XZ2e4wSqTcGAHoC1",
      "viewUrl": "https://drive.google.com/file/d/1ioCRtsuoROsKaB18XZ2e4wSqTcGAHoC1/view?usp=drivesdk"
    },
    {
      "name": "70.jpg",
      "id": "1uh1hbHLF-HTgCaE0nHfDFMUS6QdyUzWI",
      "url": "https://lh3.googleusercontent.com/d/1uh1hbHLF-HTgCaE0nHfDFMUS6QdyUzWI",
      "viewUrl": "https://drive.google.com/file/d/1uh1hbHLF-HTgCaE0nHfDFMUS6QdyUzWI/view?usp=drivesdk"
    },
    {
      "name": "71.jpg",
      "id": "1Y8SyGjqfhJeD7kDXZADXScJI1cxXK4w0",
      "url": "https://lh3.googleusercontent.com/d/1Y8SyGjqfhJeD7kDXZADXScJI1cxXK4w0",
      "viewUrl": "https://drive.google.com/file/d/1Y8SyGjqfhJeD7kDXZADXScJI1cxXK4w0/view?usp=drivesdk"
    },
    {
      "name": "72.jpg",
      "id": "1svzTS-V2u9gRdSa6WFfmv5hVmXBivfaG",
      "url": "https://lh3.googleusercontent.com/d/1svzTS-V2u9gRdSa6WFfmv5hVmXBivfaG",
      "viewUrl": "https://drive.google.com/file/d/1svzTS-V2u9gRdSa6WFfmv5hVmXBivfaG/view?usp=drivesdk"
    }
  ]
},
  "19": {
  "key": "19",
  "title": "19. გ.ს. ყოველთა და ყოვლისათვის",
  "folderId": "1sRST89TE-gJrDYs-pIYJ6kGF_YR2iVOb",
  "folderUrl": "https://drive.google.com/drive/folders/1sRST89TE-gJrDYs-pIYJ6kGF_YR2iVOb",
  "voice1Url": "https://drive.usercontent.google.com/download?id=1qG6cJpp-EktBwDPpXrCmr8a5-TK-E3ef&export=download",
  "voice2Url": "https://drive.usercontent.google.com/download?id=1CEhnf7F5bwW2ZioSnVonUICLTJRNxXfe&export=download",
  "voice3Url": "https://drive.usercontent.google.com/download?id=1FnY7Z2F5w-TYBcOOLp_GIBQCsJZIeavX&export=download",
  "allVoicesUrl": "https://drive.usercontent.google.com/download?id=17709iWifimOywmO1GGJamRNhvZy0S4Ei&export=download",
  "tracks": [
    "https://drive.usercontent.google.com/download?id=1qG6cJpp-EktBwDPpXrCmr8a5-TK-E3ef&export=download",
    "https://drive.usercontent.google.com/download?id=1CEhnf7F5bwW2ZioSnVonUICLTJRNxXfe&export=download",
    "https://drive.usercontent.google.com/download?id=1FnY7Z2F5w-TYBcOOLp_GIBQCsJZIeavX&export=download",
    "https://drive.usercontent.google.com/download?id=17709iWifimOywmO1GGJamRNhvZy0S4Ei&export=download"
  ],
  "availableVoices": {
    "voice1": true,
    "voice2": true,
    "voice3": true,
    "all": true
  },
  "notes": [
    {
      "name": "53.jpg",
      "id": "1hs6eQbUoEHGHUPvaIw6qSkE_CvXZUlDi",
      "url": "https://lh3.googleusercontent.com/d/1hs6eQbUoEHGHUPvaIw6qSkE_CvXZUlDi",
      "viewUrl": "https://drive.google.com/file/d/1hs6eQbUoEHGHUPvaIw6qSkE_CvXZUlDi/view?usp=drivesdk"
    }
  ]
},
  "20": {
  "key": "20",
  "title": "20. გ.ს. მამაო ჩვენო",
  "folderId": "1ceBe2e5VJXQmJQcAjQINm5XpJv9kSd8H",
  "folderUrl": "https://drive.google.com/drive/folders/1ceBe2e5VJXQmJQcAjQINm5XpJv9kSd8H",
  "voice1Url": "https://drive.usercontent.google.com/download?id=17UQgAkcgDKv22qh8fRk88QICMMqBhCsq&export=download",
  "voice2Url": "https://drive.usercontent.google.com/download?id=1oEBB0RBC5mrK-jPIX_4t5g4Yaz6XCzhR&export=download",
  "voice3Url": "https://drive.usercontent.google.com/download?id=1NvB97zLM8M_u7Jt9A23dQ2g3zX5PEvnB&export=download",
  "allVoicesUrl": "https://drive.usercontent.google.com/download?id=19om2sY6A9PL7Kp-7tIdoQ35725BOhRUf&export=download",
  "tracks": [
    "https://drive.usercontent.google.com/download?id=17UQgAkcgDKv22qh8fRk88QICMMqBhCsq&export=download",
    "https://drive.usercontent.google.com/download?id=1oEBB0RBC5mrK-jPIX_4t5g4Yaz6XCzhR&export=download",
    "https://drive.usercontent.google.com/download?id=1NvB97zLM8M_u7Jt9A23dQ2g3zX5PEvnB&export=download",
    "https://drive.usercontent.google.com/download?id=19om2sY6A9PL7Kp-7tIdoQ35725BOhRUf&export=download"
  ],
  "availableVoices": {
    "voice1": true,
    "voice2": true,
    "voice3": true,
    "all": true
  },
  "notes": [
    {
      "name": "302.jpg",
      "id": "1nS1ErhE_-gaEQGw84WUhWEZn9Q5fKV2I",
      "url": "https://lh3.googleusercontent.com/d/1nS1ErhE_-gaEQGw84WUhWEZn9Q5fKV2I",
      "viewUrl": "https://drive.google.com/file/d/1nS1ErhE_-gaEQGw84WUhWEZn9Q5fKV2I/view?usp=drivesdk"
    },
    {
      "name": "303.jpg",
      "id": "1DFjdWeFC79Wxr8ugOxTFGwf5fwAUTD1S",
      "url": "https://lh3.googleusercontent.com/d/1DFjdWeFC79Wxr8ugOxTFGwf5fwAUTD1S",
      "viewUrl": "https://drive.google.com/file/d/1DFjdWeFC79Wxr8ugOxTFGwf5fwAUTD1S/view?usp=drivesdk"
    },
    {
      "name": "304.jpg",
      "id": "11UpW5RRIGeQaYWV2DJdPLV1EA3yZgUg-",
      "url": "https://lh3.googleusercontent.com/d/11UpW5RRIGeQaYWV2DJdPLV1EA3yZgUg-",
      "viewUrl": "https://drive.google.com/file/d/11UpW5RRIGeQaYWV2DJdPLV1EA3yZgUg-/view?usp=drivesdk"
    }
  ]
},
  "21": {
  "key": "21",
  "title": "21. გ.ს. ერთ არს უფალი",
  "folderId": "1XfGmi0P23YAIQKDsR9b_QbdHJfoQmFEh",
  "folderUrl": "https://drive.google.com/drive/folders/1XfGmi0P23YAIQKDsR9b_QbdHJfoQmFEh",
  "voice1Url": "https://drive.usercontent.google.com/download?id=1UJWBGmM1FA1nGTBEgLdrxslDBxcbpmgv&export=download",
  "voice2Url": "https://drive.usercontent.google.com/download?id=1z_CS7tN-SEe6ssIM-dT_etZfB1pVWvYE&export=download",
  "voice3Url": "https://drive.usercontent.google.com/download?id=13dr0GYaaQIKhi6A_zKH8Nb31m9f8znTY&export=download",
  "allVoicesUrl": "https://drive.usercontent.google.com/download?id=1IyyxfyBpTECQsJHyRWM3Ht4quqMEOLEh&export=download",
  "tracks": [
    "https://drive.usercontent.google.com/download?id=1UJWBGmM1FA1nGTBEgLdrxslDBxcbpmgv&export=download",
    "https://drive.usercontent.google.com/download?id=1z_CS7tN-SEe6ssIM-dT_etZfB1pVWvYE&export=download",
    "https://drive.usercontent.google.com/download?id=13dr0GYaaQIKhi6A_zKH8Nb31m9f8znTY&export=download",
    "https://drive.usercontent.google.com/download?id=1IyyxfyBpTECQsJHyRWM3Ht4quqMEOLEh&export=download"
  ],
  "availableVoices": {
    "voice1": true,
    "voice2": true,
    "voice3": true,
    "all": true
  },
  "notes": [
    {
      "name": "55.jpg",
      "id": "1SgvmehIxsm2Tt97KzFfaBbITVzhT0BM7",
      "url": "https://lh3.googleusercontent.com/d/1SgvmehIxsm2Tt97KzFfaBbITVzhT0BM7",
      "viewUrl": "https://drive.google.com/file/d/1SgvmehIxsm2Tt97KzFfaBbITVzhT0BM7/view?usp=drivesdk"
    }
  ]
},
  "22": {
  "key": "22",
  "title": "22.გ.ს.  კურთხეულ არს მომავალი",
  "folderId": "1CLoyEyQXIowF5xtZVZQfv-HmGDHSFFuj",
  "folderUrl": "https://drive.google.com/drive/folders/1CLoyEyQXIowF5xtZVZQfv-HmGDHSFFuj",
  "voice1Url": "https://drive.usercontent.google.com/download?id=1eNIYs6Fz4kUR6DeC0leMzacvvAwXE_cT&export=download",
  "voice2Url": "https://drive.usercontent.google.com/download?id=1rYgU3AjXTTAeJmHqoH-MX329Pm00Qy7-&export=download",
  "voice3Url": "https://drive.usercontent.google.com/download?id=1uO4qSuS6-az2_2z-hM5fV8gRNgzngXm3&export=download",
  "allVoicesUrl": "https://drive.usercontent.google.com/download?id=12NF_CsbOL1zr-Z9BP9NhDG2sA05bRS6Q&export=download",
  "tracks": [
    "https://drive.usercontent.google.com/download?id=1eNIYs6Fz4kUR6DeC0leMzacvvAwXE_cT&export=download",
    "https://drive.usercontent.google.com/download?id=1rYgU3AjXTTAeJmHqoH-MX329Pm00Qy7-&export=download",
    "https://drive.usercontent.google.com/download?id=1uO4qSuS6-az2_2z-hM5fV8gRNgzngXm3&export=download",
    "https://drive.usercontent.google.com/download?id=12NF_CsbOL1zr-Z9BP9NhDG2sA05bRS6Q&export=download"
  ],
  "availableVoices": {
    "voice1": true,
    "voice2": true,
    "voice3": true,
    "all": true
  },
  "notes": [
    {
      "name": "56.jpg",
      "id": "1eQPToONbgPL9SMpBfn6aCM0X3I13PCCe",
      "url": "https://lh3.googleusercontent.com/d/1eQPToONbgPL9SMpBfn6aCM0X3I13PCCe",
      "viewUrl": "https://drive.google.com/file/d/1eQPToONbgPL9SMpBfn6aCM0X3I13PCCe/view?usp=drivesdk"
    }
  ]
},
  "23": {
  "key": "23",
  "title": "23. გ.ს ხორცი ქრისტესი მოვიღოთ",
  "folderId": "12FOWPPlYXpWAb-1BVtzOod5-RXhfA9FT",
  "folderUrl": "https://drive.google.com/drive/folders/12FOWPPlYXpWAb-1BVtzOod5-RXhfA9FT",
  "voice1Url": "https://drive.usercontent.google.com/download?id=1TuFFTy5qnbGJOmIV8LiF6gZRzY6vbj88&export=download",
  "voice2Url": "https://drive.usercontent.google.com/download?id=17LfbABKWxiwhGROf_HILUxGZDrAwVlrW&export=download",
  "voice3Url": "https://drive.usercontent.google.com/download?id=1REqSiDyg1P_V1c-Z0SjhIOi6N0LhdRpf&export=download",
  "allVoicesUrl": "https://drive.usercontent.google.com/download?id=14f4jYh77MqRbexsFpo0P25O3G3ZkHO-e&export=download",
  "tracks": [
    "https://drive.usercontent.google.com/download?id=1TuFFTy5qnbGJOmIV8LiF6gZRzY6vbj88&export=download",
    "https://drive.usercontent.google.com/download?id=17LfbABKWxiwhGROf_HILUxGZDrAwVlrW&export=download",
    "https://drive.usercontent.google.com/download?id=1REqSiDyg1P_V1c-Z0SjhIOi6N0LhdRpf&export=download",
    "https://drive.usercontent.google.com/download?id=14f4jYh77MqRbexsFpo0P25O3G3ZkHO-e&export=download"
  ],
  "availableVoices": {
    "voice1": true,
    "voice2": true,
    "voice3": true,
    "all": true
  },
  "notes": [
    {
      "name": "56.jpg",
      "id": "11mxx4yfUrJ-bnhEEyD9AlkMreMYGYS-t",
      "url": "https://lh3.googleusercontent.com/d/11mxx4yfUrJ-bnhEEyD9AlkMreMYGYS-t",
      "viewUrl": "https://drive.google.com/file/d/11mxx4yfUrJ-bnhEEyD9AlkMreMYGYS-t/view?usp=drivesdk"
    }
  ]
},
  "24": {
  "key": "24",
  "title": "24.გ.ს. ნათელი ჭეშმარიტი",
  "folderId": "1ngWyF2gA39VXJvzN7K-eiDgVs-Lbg0mZ",
  "folderUrl": "https://drive.google.com/drive/folders/1ngWyF2gA39VXJvzN7K-eiDgVs-Lbg0mZ",
  "voice1Url": "https://drive.usercontent.google.com/download?id=1_x2kfjoUPwU-TfjGjKNXyTynRgG-cu-Z&export=download",
  "voice2Url": "https://drive.usercontent.google.com/download?id=1bP5SmHdE2KQ65fhffVtu2kMlbWxeBjY_&export=download",
  "voice3Url": "https://drive.usercontent.google.com/download?id=1B57lEQDvSXEz9jR-ivqOvIAPjTLu-6rW&export=download",
  "allVoicesUrl": "https://drive.usercontent.google.com/download?id=1Liy_y6aFbztZ11sN0lkPxdKc7DeQeHu1&export=download",
  "tracks": [
    "https://drive.usercontent.google.com/download?id=1_x2kfjoUPwU-TfjGjKNXyTynRgG-cu-Z&export=download",
    "https://drive.usercontent.google.com/download?id=1bP5SmHdE2KQ65fhffVtu2kMlbWxeBjY_&export=download",
    "https://drive.usercontent.google.com/download?id=1B57lEQDvSXEz9jR-ivqOvIAPjTLu-6rW&export=download",
    "https://drive.usercontent.google.com/download?id=1Liy_y6aFbztZ11sN0lkPxdKc7DeQeHu1&export=download"
  ],
  "availableVoices": {
    "voice1": true,
    "voice2": true,
    "voice3": true,
    "all": true
  },
  "notes": [
    {
      "name": "60.jpg",
      "id": "1gXY38zqClFhkeqprb7pHZ8ZZrq0LonrE",
      "url": "https://lh3.googleusercontent.com/d/1gXY38zqClFhkeqprb7pHZ8ZZrq0LonrE",
      "viewUrl": "https://drive.google.com/file/d/1gXY38zqClFhkeqprb7pHZ8ZZrq0LonrE/view?usp=drivesdk"
    }
  ]
},
  "25": {
  "key": "25",
  "title": "25. გ.ს აღავსე პირი ჩემი",
  "folderId": "1o0jnDVQKMIIOo2HeV1gU1g9K_DM33Yka",
  "folderUrl": "https://drive.google.com/drive/folders/1o0jnDVQKMIIOo2HeV1gU1g9K_DM33Yka",
  "voice1Url": "https://drive.usercontent.google.com/download?id=1F-PQtJB3KAC7UIcQ38FyAkU_1Lbw2DBQ&export=download",
  "voice2Url": "https://drive.usercontent.google.com/download?id=1uAfPSTBid3fHQvpwSAesbST4Q4wTTr51&export=download",
  "voice3Url": "https://drive.usercontent.google.com/download?id=10mT2DOR6rMk045jD0EEQpykTjTW29Duq&export=download",
  "allVoicesUrl": "https://drive.usercontent.google.com/download?id=1zz0mCrBo0JM-TDdEnQrxFDTQS_JYlRq3&export=download",
  "tracks": [
    "https://drive.usercontent.google.com/download?id=1F-PQtJB3KAC7UIcQ38FyAkU_1Lbw2DBQ&export=download",
    "https://drive.usercontent.google.com/download?id=1uAfPSTBid3fHQvpwSAesbST4Q4wTTr51&export=download",
    "https://drive.usercontent.google.com/download?id=10mT2DOR6rMk045jD0EEQpykTjTW29Duq&export=download",
    "https://drive.usercontent.google.com/download?id=1zz0mCrBo0JM-TDdEnQrxFDTQS_JYlRq3&export=download"
  ],
  "availableVoices": {
    "voice1": true,
    "voice2": true,
    "voice3": true,
    "all": true
  },
  "notes": [
    {
      "name": "310.jpg",
      "id": "1MgS9X3JOGLmYXwg17ryj2YVaARtQGQmm",
      "url": "https://lh3.googleusercontent.com/d/1MgS9X3JOGLmYXwg17ryj2YVaARtQGQmm",
      "viewUrl": "https://drive.google.com/file/d/1MgS9X3JOGLmYXwg17ryj2YVaARtQGQmm/view?usp=drivesdk"
    },
    {
      "name": "311.jpg",
      "id": "1qZDiuMNolM_tUf6J6fR7-ZEWs_ssDHtc",
      "url": "https://lh3.googleusercontent.com/d/1qZDiuMNolM_tUf6J6fR7-ZEWs_ssDHtc",
      "viewUrl": "https://drive.google.com/file/d/1qZDiuMNolM_tUf6J6fR7-ZEWs_ssDHtc/view?usp=drivesdk"
    }
  ]
},
  "26": {
  "key": "26",
  "title": "26. გ.ს იყავნ სახელი უფლისა",
  "folderId": "1erOv4p4zKUmP8NyUbdSCoVDu5D6eoPyY",
  "folderUrl": "https://drive.google.com/drive/folders/1erOv4p4zKUmP8NyUbdSCoVDu5D6eoPyY",
  "voice1Url": "https://drive.usercontent.google.com/download?id=1oaM7hhUoikjvEKJUf1w_p5Jsrdpgfdfa&export=download",
  "voice2Url": "https://drive.usercontent.google.com/download?id=1z3qKROd58jT4q8nhWPMkwuiQKp74DOX_&export=download",
  "voice3Url": "https://drive.usercontent.google.com/download?id=1EXgx4EKgVK8WLLdR5wLxDojklnnvgCjC&export=download",
  "allVoicesUrl": "https://drive.usercontent.google.com/download?id=11aRq5MWPOhBkcJr0Xagumb7uIwHRFEU3&export=download",
  "tracks": [
    "https://drive.usercontent.google.com/download?id=1oaM7hhUoikjvEKJUf1w_p5Jsrdpgfdfa&export=download",
    "https://drive.usercontent.google.com/download?id=1z3qKROd58jT4q8nhWPMkwuiQKp74DOX_&export=download",
    "https://drive.usercontent.google.com/download?id=1EXgx4EKgVK8WLLdR5wLxDojklnnvgCjC&export=download",
    "https://drive.usercontent.google.com/download?id=11aRq5MWPOhBkcJr0Xagumb7uIwHRFEU3&export=download"
  ],
  "availableVoices": {
    "voice1": true,
    "voice2": true,
    "voice3": true,
    "all": true
  },
  "notes": [
    {
      "name": "312.jpg",
      "id": "1sSAJZ4oowtAY75kN2zf13IZDN_LN_Yuo",
      "url": "https://lh3.googleusercontent.com/d/1sSAJZ4oowtAY75kN2zf13IZDN_LN_Yuo",
      "viewUrl": "https://drive.google.com/file/d/1sSAJZ4oowtAY75kN2zf13IZDN_LN_Yuo/view?usp=drivesdk"
    },
    {
      "name": "313.jpg",
      "id": "1Am3apurSL591gcvP5t5XGeDXZefPRwdk",
      "url": "https://lh3.googleusercontent.com/d/1Am3apurSL591gcvP5t5XGeDXZefPRwdk",
      "viewUrl": "https://drive.google.com/file/d/1Am3apurSL591gcvP5t5XGeDXZefPRwdk/view?usp=drivesdk"
    }
  ]
},
  "27": {
  "key": "27",
  "title": "27. გ.ს, მრავლჟამიერი",
  "folderId": "1sSRZ459apux9Fs7y-jXQQgmc25we8i2z",
  "folderUrl": "https://drive.google.com/drive/folders/1sSRZ459apux9Fs7y-jXQQgmc25we8i2z",
  "voice1Url": "https://drive.usercontent.google.com/download?id=1EJOIoFR7jf3iVEXZeMUw5SXO9jqW7Dd1&export=download",
  "voice2Url": "https://drive.usercontent.google.com/download?id=1W7OCbKIy9wo7r_qi-NlDO1iRpcS9JGCn&export=download",
  "voice3Url": "https://drive.usercontent.google.com/download?id=1LBJK3AQZ3Uviz8Z8yACD62uwkVi8O-Km&export=download",
  "allVoicesUrl": "https://drive.usercontent.google.com/download?id=1q36btfn-m3H9tGQHHWxOQc4rkdZqokL4&export=download",
  "tracks": [
    "https://drive.usercontent.google.com/download?id=1EJOIoFR7jf3iVEXZeMUw5SXO9jqW7Dd1&export=download",
    "https://drive.usercontent.google.com/download?id=1W7OCbKIy9wo7r_qi-NlDO1iRpcS9JGCn&export=download",
    "https://drive.usercontent.google.com/download?id=1LBJK3AQZ3Uviz8Z8yACD62uwkVi8O-Km&export=download",
    "https://drive.usercontent.google.com/download?id=1q36btfn-m3H9tGQHHWxOQc4rkdZqokL4&export=download"
  ],
  "availableVoices": {
    "voice1": true,
    "voice2": true,
    "voice3": true,
    "all": true
  },
  "notes": [
    {
      "name": "66.jpg",
      "id": "1guwt-jJs1o5VoTxqnHs_eFiIk4c4ZA6S",
      "url": "https://lh3.googleusercontent.com/d/1guwt-jJs1o5VoTxqnHs_eFiIk4c4ZA6S",
      "viewUrl": "https://drive.google.com/file/d/1guwt-jJs1o5VoTxqnHs_eFiIk4c4ZA6S/view?usp=drivesdk"
    },
    {
      "name": "67.jpg",
      "id": "1xIfWbGZNZ8Cyst3P2veKdacafcgfeWRS",
      "url": "https://lh3.googleusercontent.com/d/1xIfWbGZNZ8Cyst3P2veKdacafcgfeWRS",
      "viewUrl": "https://drive.google.com/file/d/1xIfWbGZNZ8Cyst3P2veKdacafcgfeWRS/view?usp=drivesdk"
    }
  ]
},
};

// Drive doesn't send CORS headers, which the player's Web Audio features (voices, pitch, waveform)
// require. Drive audio links are therefore served through our Cloudflare Worker (see /worker).
// The registry keeps plain Drive links; they're rewritten once here, at load time.
export const AUDIO_PROXY = 'https://sagandzuri-audio.mr-gabunia.workers.dev';

const toPlayableUrl = (url: string | undefined) => {
  const id = url?.match(/drive\.usercontent\.google\.com\/download\?id=([A-Za-z0-9_-]+)/)?.[1];
  return id ? `${AUDIO_PROXY}/${id}` : url;
};

for (const item of Object.values(CHANT_MEDIA_REGISTRY)) {
  item.tracks = item.tracks.map(t => toPlayableUrl(t) || '') as ChantMediaItem['tracks'];
  item.voice1Url = toPlayableUrl(item.voice1Url);
  item.voice2Url = toPlayableUrl(item.voice2Url);
  item.voice3Url = toPlayableUrl(item.voice3Url);
  item.allVoicesUrl = toPlayableUrl(item.allVoicesUrl);
}

// Which recording belongs to which variant ("chantId|variantCode" -> registry key).
// Only variants listed here get a player; every other variant shows "no recording yet".
// Drive folders are named "გ.ს.", so each one is bound to its chant's გ.ს. variant
// unless the user said otherwise.
const VARIANT_MEDIA: Record<string, string> = {
  'chant-5|გ.ს.': '2',        // აკურთხევს სული ჩემი
  'chant-7|გ.ს.': '3',        // მხოლოდ-შობილი
  'chant-8|გ.ს.': '5',  // სასუფეველსა შენსა (user: Drive folder 19APj6Bs6nGQIRFS3k-BzyATt0XbQ3McL); its note sheets are vol. I №159 pages
  'chant-10|გ.ს.': '6',       // მოვედით, თაყვანის-ვსცეთ
  'chant-11|გ.ს.': '6.1',     // უფალო, აცხოვნენ
  'chant-12|გ.ს.': '7',       // წმიდაო ღმერთო
  'chant-14|გ.ს.': '8',       // ალილუია შემდგომად სამოციქულოსა
  'chant-16|გ.ს.': '1',       // მრჩობლი კვერექსი
  'chant-17|გ.ს.': '9.1',     // მიცვალებულთა კვერექსი
  'chant-20|გ.ს.': '10',      // რომელი ქერუბიმთა
  'chant-20|გ.ს. გამშვ': '10.1',
  'chant-21|გ.ს.': '11',      // და ვითარცა მეუფესა
  'chant-23|გ.ს.': '12',      // მამასა და ძესა
  'chant-24|გ.ს.': '13',      // მრწამსი
  'chant-25|გ.ს.': '14.2',    // წყალობა, მშვიდობა
  'chant-27|გ.ს.': '14.1',    // გუაქვს უფლისა მიმართ
  'chant-28|გ.ს.': '14',      // ღირს არს და მართალ
  'chant-29|გ.ს.': '15',      // წმიდა არს
  'chant-30|გ.ს.': '16',      // შენ გიგალობთ
  'chant-31|გ.ს.': '18.1',    // შენდამი იხარებს
  'chant-32|გ.ს.': '18',      // ღირს არს ჭეშმარიტად
  'chant-33|გ.ს.': '19',      // ყოველთა და ყოვლისათვის
  'chant-35|გ.ს.': '20',      // მამაო ჩუენო
  'chant-37|გ.ს.': '21',      // ერთ არს
  'chant-39|გ.ს.': '22',      // კურთხეულ არს მომავალი
  'chant-40|გ.ს.': '23',      // ხორცი ქრისტესი
  'chant-41|გ.ს.': '9',       // ალილუია
  'chant-42|გ.ს.': '24',      // ნათელი ჭეშმარიტი
  'chant-43|გ.ს.': '25',      // აღავსე პირი ჩემი
  'chant-45|გ.ს.': '26',      // სახელითა უფლისათა
  'chant-46|გ.ს.': '27',      // მრავალჟამიერ
};

export function getChantMedia(chantId?: string, variantCode?: string): ChantMediaItem | undefined {
  // guests see no recordings at all
  if (recordingsAreHidden()) return undefined;
  // a recording bound in the admin panel (settings/recordings) comes first
  const bound = RUNTIME_MEDIA[`${chantId}|${variantCode}`];
  if (bound) return bound;
  const key = VARIANT_MEDIA[`${chantId}|${variantCode}`];
  return key ? CHANT_MEDIA_REGISTRY[key] : undefined;
}

/** How many versions have a recording bound in code (the admin panel shows it). */
export const codeBindingCount = () => Object.keys(VARIANT_MEDIA).length;

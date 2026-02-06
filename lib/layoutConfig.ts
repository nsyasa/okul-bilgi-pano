/**
 * Player Layout Configuration
 * 
 * Bu dosya oynatıcı ekranının düzen ayarlarını içerir.
 * Değerler FullHD (1920x1080) Android TV'ler için optimize edilmiştir.
 * 
 * ⚠️ DİKKAT: Bu değerler farklı en-boy oranlarındaki ekranlarda
 * içeriğin görünür kalması için hesaplanmıştır. Değiştirmeden önce
 * farklı ekran boyutlarında test edin.
 */

export const PLAYER_LAYOUT = {
  /**
   * Yatay (sol-sağ) güvenli alan
   * Ekranın kenarlarında kesilebilir kısımlar için boşluk
   */
  HORIZONTAL_SAFE_AREA: 100, // px
  
  /**
   * Dikey (üst-alt) güvenli alan  
   * Ekranın üst ve alt kısımlarında kesilebilir alanlar için boşluk
   */
  VERTICAL_SAFE_AREA: 50, // px

  /**
   * Alt bant için ekstra güvenli alan
   */
  BOTTOM_SAFE_AREA: 90, // px
  
  /**
   * Tailwind CSS sınıfları (otomatik üretilir)
   */
  get sidePadding() {
    return `px-[${this.HORIZONTAL_SAFE_AREA}px]`;
  },
  
  get topPadding() {
    return `pt-[${this.VERTICAL_SAFE_AREA}px]`;
  },
  
  get bottomPadding() {
    return `pb-[${this.BOTTOM_SAFE_AREA}px]`;
  },
  
  /**
   * İçerik alanı arasındaki boşluklar
   */
  CONTENT_GAP: 2, // Tailwind scale (0.5rem = 8px per unit)
  CONTENT_PADDING: 3, // Tailwind scale
} as const;

"use strict";

const products = [
  {id:1,name:"A6 Sticker Sheet – Neko",category:"Sticker",price:4.49,image:"assets/products/product-01.jpg",images:["assets/products/product-01.jpg","assets/products/product-02.jpg"],description:"A6 Stickerbogen mit liebevollen Neko-Motiven.",customizable:false},
  {id:2,name:"A6 Holo Sticker Sheet",category:"Sticker",price:4.99,image:"assets/products/product-02.jpg",images:["assets/products/product-02.jpg","assets/products/product-03.jpg"],description:"Holografischer Stickerbogen mit glänzendem Effekt.",customizable:false},
  {id:3,name:"Sticker Set – Fantasy",category:"Sticker",price:5.49,image:"assets/products/product-03.jpg",images:["assets/products/product-03.jpg","assets/products/product-04.jpg"],description:"Fantasy-Stickerset für kreative Dekorationen.",customizable:false},
  {id:4,name:"Sticker Überraschungsset",category:"Sticker",price:6.99,image:"assets/products/product-04.jpg",images:["assets/products/product-04.jpg","assets/products/product-01.jpg"],description:"Eine abwechslungsreiche Auswahl verschiedener Sticker.",customizable:false},

  {id:5,name:"Standard 3D-Anhänger",category:"3D Druck",price:8.99,image:"assets/products/product-05.jpg",images:["assets/products/product-05.jpg","assets/products/product-06.jpg","assets/products/product-07.jpg"],description:"3D-gedruckter Anhänger, handbemalt und mit UV-Harz versiegelt.",customizable:true},
  {id:6,name:"Premium Großformat-Anhänger",category:"3D Druck",price:10.99,image:"assets/products/product-06.jpg",images:["assets/products/product-06.jpg","assets/products/product-07.jpg","assets/products/product-08.jpg"],description:"Größerer Premium-Anhänger mit besonderem Finish.",customizable:true},
  {id:7,name:"3D-Druck Katzenfigur",category:"3D Druck",price:14.99,image:"assets/products/product-07.jpg",images:["assets/products/product-07.jpg","assets/products/product-08.jpg","assets/products/product-09.jpg"],description:"Dekorative Katzenfigur aus dem 3D-Drucker.",customizable:true},
  {id:8,name:"3D-Druck Fantasyfigur",category:"3D Druck",price:18.99,image:"assets/products/product-08.jpg",images:["assets/products/product-08.jpg","assets/products/product-09.jpg","assets/products/product-10.jpg"],description:"Detailreiche Fantasyfigur, sorgfältig nachbearbeitet.",customizable:true},

  {id:9,name:"Epoxidharz Pfote",category:"Epoxidharz",price:9.49,image:"assets/products/product-09.jpg",images:["assets/products/product-09.jpg","assets/products/product-10.jpg","assets/products/product-11.jpg"],description:"Handgefertigte Pfote aus Epoxidharz.",customizable:true},
  {id:10,name:"Epoxidharz Anhänger",category:"Epoxidharz",price:8.49,image:"assets/products/product-10.jpg",images:["assets/products/product-10.jpg","assets/products/product-11.jpg","assets/products/product-12.jpg"],description:"Glänzender Harzanhänger mit individuellem Charakter.",customizable:true},
  {id:11,name:"Epoxidharz Deko-Unikat",category:"Epoxidharz",price:16.99,image:"assets/products/product-11.jpg",images:["assets/products/product-11.jpg","assets/products/product-12.jpg","assets/products/product-13.jpg"],description:"Ein handgegossenes Deko-Unikat aus Epoxidharz.",customizable:true},
  {id:12,name:"UV-Harz Schlüsselanhänger",category:"Epoxidharz",price:7.99,image:"assets/products/product-12.jpg",images:["assets/products/product-12.jpg","assets/products/product-13.jpg"],description:"Kompakter Schlüsselanhänger, mit UV-Harz versiegelt.",customizable:true},

  {id:13,name:"Sticker Bundle",category:"Bundles",price:11.99,image:"assets/products/product-13.jpg",images:["assets/products/product-13.jpg","assets/products/product-14.jpg","assets/products/product-15.jpg"],description:"Drei Stickerbögen zum Vorteilspreis.",customizable:false},
  {id:14,name:"Anhänger Doppelpack",category:"Bundles",price:16.99,image:"assets/products/product-14.jpg",images:["assets/products/product-14.jpg","assets/products/product-15.jpg","assets/products/product-16.jpg"],description:"Zwei Anhänger als günstiges Set.",customizable:false},
  {id:15,name:"Premium Anhänger Bundle",category:"Bundles",price:23.99,image:"assets/products/product-15.jpg",images:["assets/products/product-15.jpg","assets/products/product-16.jpg","assets/products/product-17.jpg"],description:"Drei ausgewählte Anhänger im Premium-Bundle.",customizable:false},
  {id:16,name:"Mixed Neko Bundle",category:"Bundles",price:12.99,image:"assets/products/product-16.jpg",images:["assets/products/product-16.jpg","assets/products/product-13.jpg","assets/products/product-05.jpg"],description:"Ein Anhänger und ein Stickerbogen als gemischtes Set.",customizable:false},

  {id:17,name:"FSK-18 Sammlerfigur A",category:"FSK 18",price:29.99,image:"assets/products/product-17.jpg",images:["assets/products/product-17.jpg","assets/products/product-18.jpg"],description:"Sammlerartikel ausschließlich für volljährige Personen.",customizable:false},
  {id:18,name:"FSK-18 Sammlerfigur B",category:"FSK 18",price:34.99,image:"assets/products/product-18.jpg",images:["assets/products/product-18.jpg","assets/products/product-19.jpg"],description:"Detailreicher Sammlerartikel für Erwachsene.",customizable:false},
  {id:19,name:"FSK-18 Sammlerset",category:"FSK 18",price:54.99,image:"assets/products/product-19.jpg",images:["assets/products/product-19.jpg","assets/products/product-20.jpg","assets/products/product-17.jpg"],description:"Mehrteiliges Sammlerset ausschließlich für Erwachsene.",customizable:false},
  {id:20,name:"Individuelle Sonderanfertigung",category:"3D Druck",price:39.99,image:"assets/products/product-20.jpg",images:["assets/products/product-20.jpg","assets/products/product-05.jpg","assets/products/product-06.jpg"],description:"Individuelle Fertigung nach vorheriger Abstimmung.",customizable:true}
];

const shippingMethods = {
  hermes: {label:"Hermes Versand",price:4.95,freeFrom:50},
  dhl: {label:"DHL Paket",price:5.49,freeFrom:70}
};

// Ausschließlich hier festgelegte Codes funktionieren.
const couponCodes = {
  NEKO10: {type:"percent",value:10,label:"10 % Rabatt"},
  PAWS5: {type:"fixed",value:5,label:"5 € Rabatt"},
  FREESHIP: {type:"shipping",value:0,label:"Kostenloser Versand"}
};

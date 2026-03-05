"use client";

import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, EffectFade, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/effect-fade";
import "swiper/css/pagination";

const slidesData = [
  {
    id: 1,
    videoSrc: "/videos/hero-all-products.mp4",
    title: "Billions Super Masks",
    subtitle: "Купи NFT — получи реальный пак масок с доставкой.",
    buttonText: "Перейти к минту",
  },
  {
    id: 2,
    videoSrc: "/videos/hero-cacao.mp4",
    title: "Вкус Web3: Какао",
    subtitle: "Согревающий напиток для холдеров. Лимитированная серия.",
    buttonText: "Торговать сейчас",
  },
  {
    id: 3,
    videoSrc: "/videos/hero-flakes.mp4",
    title: "Завтрак Холдера",
    subtitle: "Зарядись крипто-хлопьями на весь день.",
    buttonText: "Купить NFT + Доставка",
  },
];

export default function HeroSlider() {
  return (
    // Контейнер баннера. h-[500px] или h-[600px] задает высоту
    <section className="w-full h-[550px] bg-neutral-950 flex items-center justify-center border-b border-neutral-800">
      <Swiper
        modules={[Autoplay, EffectFade, Pagination]}
        effect="fade"
        speed={800}
        autoplay={{ delay: 6000, disableOnInteraction: false }}
        pagination={{ clickable: true }}
        className="w-full h-full"
      >
        {slidesData.map((slide) => (
          <SwiperSlide key={slide.id}>
            {/* Сетка: 2 колонки на десктопе, 1 колонка на мобилках */}
            <div className="grid md:grid-cols-2 gap-8 items-center max-w-7xl mx-auto w-full h-full px-6 py-10">
              
              {/* Левая часть: Текст */}
              <div className="text-white space-y-6 z-10">
                <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight drop-shadow-md">
                  {slide.title}
                </h1>
                <p className="text-xl text-neutral-300 max-w-md">
                  {slide.subtitle}
                </p>
                <button className="px-8 py-3 bg-white text-black rounded-full font-bold hover:scale-105 transition-transform shadow-lg">
                  {slide.buttonText}
                </button>
              </div>

              {/* Правая часть: Вертикальное видео */}
              <div className="h-full w-full flex justify-center md:justify-end items-center overflow-hidden z-10">
                {/* Обертка для видео, чтобы сделать красивые скругления */}
                <div className="relative h-[90%] w-auto aspect-[9/16] rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black">
                  <video
                    src={slide.videoSrc}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
}
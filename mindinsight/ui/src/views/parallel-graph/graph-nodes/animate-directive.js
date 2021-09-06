import {gsap} from 'gsap';

const DURATION = 0.2;
/**
 * animate property when updating
 * example: <rect v-animate:width="width"/>
 **/
export const animateDirective = {
  bind: function(el, binding) {
    const {value, arg: property} = binding;

    gsap.fromTo(
        el,
        {[property]: Math.max(value - 10, 0), opacity: 0},
        {duration: DURATION, [property]: value, opacity: 1, ease: 'power2'},
    );
  },

  update: function(el, binding) {
    const {value, arg: property} = binding;

    gsap.to(el, {duration: DURATION, [property]: value});
  },
};

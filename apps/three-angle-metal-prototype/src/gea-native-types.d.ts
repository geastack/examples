declare const __gea_three_angle_int_brand: unique symbol
declare const __gea_three_angle_f32_brand: unique symbol

type int = number & { readonly [__gea_three_angle_int_brand]?: never }
type f32 = number & { readonly [__gea_three_angle_f32_brand]?: never }

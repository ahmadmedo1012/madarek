import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import Svg, { Line } from "react-native-svg";
import Animated from "react-native-reanimated";
import { router, useLocalSearchParams } from "expo-router";
import { AppStatusBar } from "@/design/statusbar";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { Screen } from "@/components/ui/screen";
import { T } from "@/components/ui/text";
import { Button } from "@/components/ui/pressables";
import { BrandMark } from "@/components/ui/brand";
import { Hairline } from "@/components/ui/surfaces";
import { useStaggerEntrance } from "@/motion";
import { Illustration } from "@/components/Illustration";

/**
 * /auth — the Welcome: the app's SIGNATURE MOMENT.
 *
 * R345 F: the hero seat rides the R342 original mobile-hero composition
 * (the dedicated 768×1440 portrait drawing of the learning complex —
 * lecture hall, library gallery, arcade courtyard; light/dark twins
 * from the ONE illustration register) as a top band, cropped by cover
 * to the band's height. Decisive Arabic display type, then the action
 * stack rises in a staggered entrance (base 120 · step 90 — well under
 * the 400ms rhythm cap; reduced-motion lands instantly). ONE orange CTA
 * («ابدأ الآن») + ONE quiet text link — no boxed cards, the paper is the
 * design.
 *
 * Guests reach this from the boot handoff; ?continue= rides every action
 * for post-auth return. Signed-in users are normally routed straight to
 * their role home by the boot screen.
 */
export default function Welcome() {
  const { bg, text } = usePalette();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ continue?: string }>();
  const enter = useStaggerEntrance({ base: 120, step: 90 });

  const withContinue = (pathname: string) =>
    params.continue ? ({ pathname, params: { continue: params.continue } } as never) : (pathname as never);

  return (
    <>
      <AppStatusBar />
      <Screen
        scroll
        padded={false}
        style={{ backgroundColor: bg }}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        {/* the drafting sheet: faint axis grid across the whole paper */}
        <GridBackdrop color={text} />

        {/* the signature band: the mobile hero of the learning complex
            (R345 review: 348pt — the portrait composition carries the
            screen's visual weight; the title stack follows tight) */}
        <Animated.View entering={enter(0)}>
          <Illustration id="r342/hero-campus-mobile" width={width} height={348} />
        </Animated.View>

        <View style={{ paddingHorizontal: sp[24], paddingTop: sp[24], paddingBottom: sp[16], flexGrow: 1 }}>
          {/* quiet mark row — the drawing carries the brand from here */}
          <Animated.View entering={enter(1)} style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
            <BrandMark size={20} />
            <T variant="bodyLg" weight="bold">مدارك</T>
          </Animated.View>

          {/* title stack — decisive display type */}
          <Animated.View entering={enter(2)} style={{ marginTop: sp[24], gap: sp[6] }}>
            <T variant="display" weight="bold" style={{ lineHeight: 40 }}>رحلة تعلم واحدة</T>
            <T variant="h4" weight="medium" color="secondary">من المحاضرة إلى الإتقان</T>
          </Animated.View>

          {/* decisive actions — ONE orange CTA, one quiet link */}
          <Animated.View entering={enter(3)} style={{ marginTop: "auto", paddingTop: sp[40], gap: sp[4] }}>
            <Button
              label="ابدأ الآن"
              kind="accent"
              onPress={() => router.push(withContinue("/auth/login"))}
            />
            <Pressable
              accessibilityRole="link"
              hitSlop={8}
              onPress={() => router.push(withContinue("/auth/register"))}
              style={({ pressed }) => ({ minHeight: 44, justifyContent: "center", opacity: pressed ? 0.6 : 1 })}
            >
              <T variant="body" weight="medium" color="secondary" style={{ textAlign: "center" }}>
                إنشاء حساب جديد
              </T>
            </Pressable>
          </Animated.View>

          <Animated.View entering={enter(3)} style={{ marginTop: sp[24], gap: sp[8] }}>
            <Hairline />
            <T variant="xs" color="faint">
              مدارك منصّة تعليمية مستقلّة عربية-أولًا من ليبيا — بيانات مؤسّسة العرض المرجعية بوضع الطيار الحالي.
            </T>
          </Animated.View>
        </View>
      </Screen>
    </>
  );
}

/** Full-bleed hairline grid — the drafting paper under the whole sheet. */
function GridBackdrop({ color }: { color: string }) {
  const { width, height } = useWindowDimensions();
  const step = 32;
  const cols = Math.ceil(width / step);
  const rows = Math.ceil(height / step);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={width} height={height} style={{ opacity: 0.06 }}>
        {Array.from({ length: cols + 1 }, (_, i) => (
          <Line key={`v${i}`} x1={i * step} y1={0} x2={i * step} y2={height} stroke={color} strokeWidth={1} />
        ))}
        {Array.from({ length: rows + 1 }, (_, i) => (
          <Line key={`h${i}`} x1={0} y1={i * step} x2={width} y2={i * step} stroke={color} strokeWidth={1} />
        ))}
      </Svg>
    </View>
  );
}

import { RoleTabFrame } from "@/components/shell/TabFrame";

import { Assistant } from "@/features/ai/Assistant";

/** /teacher/ai — the AI academic assistant with the honest provider badge. */
function Ai() {
  return <Assistant />;
}


export default function AiTabbed() {
  return (
    <RoleTabFrame role="TEACHER">
      <Ai />
    </RoleTabFrame>
  );
}

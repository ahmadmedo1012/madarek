import { RoleTabFrame } from "@/components/shell/TabFrame";

import { Assistant } from "@/features/ai/Assistant";

function Ai() {
  return <Assistant />;
}


export default function AiTabbed() {
  return (
    <RoleTabFrame role="STUDENT">
      <Ai />
    </RoleTabFrame>
  );
}

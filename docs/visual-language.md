# OH-pera visual language

## Direction
A contemporary opera salon: theatrical editorial typography, restrained glass surfaces, and fine architectural geometry. The references are the grandeur of an opera house, the clarity and restraint of Apple product pages, and Renaissance studies of proportion. This is an original identity, not a reproduction of another site's brand.

The graphic audit identified conflicting flat cards, rectangular controls, and theatrical imagery. The new stylesheet replaces the accumulated overrides with a single coherent system across Discover, Saved, Seasons, About, sources, and performance details.

## Foundations
- Pearl background: #F7F4EF. Warm ink: #251C20. Oxblood action color: #76283E. Brass ornament: #987B50.
- Display: Bodoni Moda, normal and italic, loaded through the existing font pipeline with serif fallback. Interface: Geist and native system sans-serif fallbacks.
- Use italic display type sparingly in the hero. Keep utility controls plain and readable.
- Keep existing original opera artwork vivid. Translucency belongs to the card surface and information panels, not to the artwork itself.
- Decorative circles, axes, and construction lines are noninteractive and hidden from assistive technology.

## Components
- Cards: 25px radius, translucent pearl fill, fine light border, inset highlight, restrained shadow.
- Search fields, selects, date shortcuts, segmented controls, and actions: pill-shaped. Visible labels are retained.
- Main actions: oxblood. Secondary actions: quiet pearl with a contrasting outline.
- Metadata and source warnings remain readable and distinct from decorative brass.
- Avoid parallax, animated blur, and strong hover movement. Honor reduced motion.
- Use opaque surfaces when blur is unsupported, reduced transparency is requested, or contrast preferences require it. Preserve visible focus indicators and at least 44px control heights.

## Scope
Presentation changes preserve production grouping, saved dates, source notices, date selection, shareable links, and the accessible native dialog. Quick date pills mirror the date selector; they are shortcuts to the same state.


## New York Art Deco refinement

The discovery hero occupies about 85% of the viewport, with a 680px desktop and 660px mobile minimum. Larger Bodoni lettering and generous space give the performance film a marquee treatment. Brass corner rules, double-line section markers, and restrained artwork frames introduce Art Deco while keeping the glass cards and pill filters. The Explore performances link jumps past the hero with clearance for the sticky header.

Navigation begins opaque and becomes pearl glass after 32px of scrolling. Reduced-transparency, increased-contrast, and unsupported-blur environments retain an opaque background for legibility.

Art Deco is ornamentation only: no large geometric overlays over the performance, text, or controls. Keep decorative work at the edges and in small dividers.

The hero search panel deliberately retains translucent glass, including under increased-contrast/reduced-transparency preferences, per the requested visual treatment. Its controls use light translucent fills and dark text. Other surfaces, including the scrolling header, retain their opaque accessibility fallbacks.

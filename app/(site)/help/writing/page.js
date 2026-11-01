import Link from "next/link";
import ArticleHelp from "@/components/ArticleHelp";
import FigureHelp from "@/components/FigureHelp";
import LinkApp from "@/components/LinkApp";
import { isCloud } from "@/lib/config";
import { getHelpHref, getHelpPageMetadata } from "@/lib/help";
import { UNSUBSCRIBE_PLACEHOLDER } from "@/lib/render-email";
import { MAX_SECTION_GROUPS, MAX_SECTIONS } from "@/lib/sections";

export const metadata = getHelpPageMetadata("writing");

export default function WritingPage() {
	return (
		<ArticleHelp slug="writing">
			<h2 id="steps">Write, review, send</h2>
			<p>
				Start a draft with New, on the <LinkApp href="/campaigns">Campaigns page</LinkApp>. A campaign goes through three steps, shown at the
				top: Write, where you type the
				subject, the preview text and the issue; Review, a checklist of what to fix before it can go out and of what may look broken;
				and Send, where you pick
				who gets it and when
				{isCloud() && (
					<>
						, with <Link href={getHelpHref("sending", "tips")}>tips for more opens</Link> before it goes out when your issue has
						some
					</>
				)}
				. Everything saves as you type, and a check shows each time it&apos;s saved. While you edit, the{" "}
				<Link href={getHelpHref("getting-started", "sidebar")}>sidebar</Link> folds down to its icons to leave the issue more room.
			</p>
			<p>
				Once you have a campaign, New asks how to start: Blank, or Copy a campaign, which lists your campaigns, sent or not. The one
				you pick opens as a new draft with its subject, followed by (copy), its preview text and its content. The campaign you copied
				stays as it is.
			</p>
			<p>
				The preview text is what inboxes show after the subject. Without one, they show your issue&apos;s first words.
			</p>

			<h2 id="editor">The editor</h2>
			<ul>
				<li>
					<strong>Content blocks</strong>: the dock beside the issue adds a picture, a heading, a paragraph, a{" "}
					<Link href={getHelpHref("writing", "buttons")}>button</Link>, a divider, a spacer,{" "}
					<Link href={getHelpHref("writing", "html")}>your own HTML</Link>,{" "}
					<Link href={getHelpHref("writing", "social-blocks")}>social links</Link> or a{" "}
					<Link href={getHelpHref("writing", "video-blocks")}>video</Link>. Click one to add it where the cursor is, or drag it where
					it goes. Drop it beside a block to make <Link href={getHelpHref("writing", "columns")}>columns</Link>.
				</li>
				<li>
					<strong>Formatting</strong>: select text to get bold, italic, strikethrough, a link, two heading sizes and a quote.
				</li>
				<li>
					<strong>Slash commands</strong>: type <kbd>/</kbd> on an empty line for text, three heading sizes, bulleted and numbered
					lists, a quote, a divider, a picture, a <Link href={getHelpHref("writing", "buttons")}>button</Link>, a box, which sets a
					block apart on a gray background, or <Link href={getHelpHref("writing", "html")}>your own HTML</Link>. Under them,
					Personalize has a <Link href={getHelpHref("writing", "sections")}>section for some readers</Link>, then the{" "}
					<Link href={getHelpHref("writing", "first-name")}>first name and your own fields</Link>, and Add a field to make a new one
					without leaving the issue. The arrow keys move through the menu. Keep typing after the slash to find any of them, like{" "}
					<kbd>/quote</kbd> or a field&apos;s name.
				</li>
				<li>
					<strong>Links</strong>: select text, press <kbd>⌘ K</kbd> (<kbd>Ctrl K</kbd> on Windows) and paste the address. An email
					address becomes a link that opens an email to it.
				</li>
				<li>
					<strong>Markdown</strong>: shortcuts work as you type, like <code>#</code> and a space for a heading, <code>-</code> for a
					list or <code>&gt;</code> for a quote.
				</li>
			</ul>
			<FigureHelp
				src="/help/writing/slash-menu.webp"
				alt="The slash menu under a paragraph: text, three headings, bullets, numbers, a quote, a divider, an image, a button, a box and HTML, then a section and the contact fields, with Add a field."
				caption="The slash menu"
			/>

			<h2 id="pictures">Pictures</h2>
			<p>
				Paste a picture, drop it in the editor, or type <kbd>/</kbd> and pick Image to upload one or use one you uploaded before. PNG,
				JPEG, GIF and WebP work, under 4 MB. Wider pictures are resized to 1,200 pixels. A picture shows at once and uploads in the
				background, and its address never changes, so sent emails keep showing it.
			</p>
			<p>
				Drag the handles on a picture&apos;s sides to resize it. Click a picture to open its settings on the right. Original keeps its
				own size, never wider than the column; Fill stretches it
				to the column&apos;s width; Scale sets its width as a percentage. Place it on the left, in the center or on the right, link it
				to a web page and choose whether the link opens a new tab. Duplicate, Move up, Move down and Delete are at the bottom of the
				panel. Emails and your website keep these settings.
			</p>
			<FigureHelp
				src="/help/writing/picture-settings.webp"
				alt="A picture selected in the editor, with its settings on the right: size, alignment, link, delivery and alt text."
				caption="A picture and its settings"
			/>
			<p>
				Alt text describes the picture in a few words, for readers who can&apos;t see it, inboxes that block images and search
				engines reading your website. Type it under Accessibility in the picture&apos;s settings. Leave it blank for a picture that&apos;s
				only decoration, so screen readers skip it. Delivery chooses how the picture travels in emails: see{" "}
				<Link href={getHelpHref("writing", "image-delivery")}>hosted and embedded images</Link>.
			</p>

			<h2 id="buttons">Buttons</h2>
			<p>
				Type <kbd>/</kbd> and pick Button to add a link readers can&apos;t miss, like Read the full story or Join the waitlist. Type
				its text right on the button, press <kbd>Enter</kbd> and paste the link it opens: a web address, or an email address, which
				opens an email to it. <kbd>Enter</kbd> again goes on below it. While you write on a button, the settings panel on the right edits its link,
				places it on the left, in the center or on the right, and duplicates, moves or deletes it. Deletions can be{" "}
				<Link href={getHelpHref("writing", "deleting-blocks")}>undo</Link>. Use the link field, or press <kbd>⌘ K</kbd>, to change its destination.
				Names and fields work in its text and its link.
			</p>
			<FigureHelp
				src="/help/writing/button.webp"
				alt="A button selected in the editor, with its settings on the right: its link, its alignment and the buttons to duplicate, move or delete it."
				caption="A button and its settings"
			/>
			<p>
				Buttons take your newsletter&apos;s <Link href={getHelpHref("design", "customize")}>theme</Link>: its accent color, with text
				that reads on it, and its corners, in your emails and on your website. Change them in{" "}
				<LinkApp href="/newsletters/design">Design</LinkApp>, and every button follows. A button needs its text and its link before the
				issue can go out: a <Link href={getHelpHref("writing", "problems")}>red dot</Link> beside it says which is missing once
				you move on, and so does the review step.
			</p>

			<h2 id="text-styles">Headings, paragraphs and dividers</h2>
			<p>
				Click in a heading or paragraph to open its settings on the right: its level or text style, font, size, alignment, line
				height, letter spacing, text and background colors, padding, the space above it, a border and rounded corners. Reset
				formatting puts it back the way it started. The fonts are ones every inbox has, each with a similar font to fall back on.
			</p>
			<p>
				Click a divider, anywhere in its highlighted area, to change its line&apos;s color, style and thickness and the space around
				it. From the keyboard, <kbd>Tab</kbd> to it and press <kbd>Enter</kbd>. A spacer adds a fixed gap between two blocks. Emails
				and your website show all of these the same way.
			</p>

			<h2 id="columns">Columns</h2>
			<p>
				Drag a block from the dock onto the left or right half of a block in the issue, and the two sit side by side in columns. A
				shaded area shows which side it lands on. Each column takes any mix of blocks: drag more into one, and a purple line shows
				where they land. The gray outlines around columns only show while you edit.
			</p>
			<p>
				While you edit in a column, its settings open at the bottom left. Columns share a grid 12 parts wide: change one
				column&apos;s width and its neighbor makes room. Add column adds another. A column&apos;s bin deletes it and gives its width
				to the others, after asking first if it has anything in it. With one column left, its blocks go back into the issue. Deleting
				a column undoes like any other change.
			</p>
			<FigureHelp
				src="/help/writing/columns.webp"
				alt="Two columns in the editor, a short one on the left and a wider one on the right, with the column settings showing their widths."
				caption="Columns and their widths"
			/>
			<p>
				On your website, columns sit side by side on a wide screen and stack on a phone. Emails keep them side by side on every
				screen, so on a phone each column is narrow: keep column text short.
			</p>

			<h2 id="video-blocks">Video</h2>
			<p>Choose Video at the end of the content dock, then click its placeholder to open its settings. Paste a YouTube, TikTok, Vimeo, Loom or another HTTPS video URL. The thumbnail links to the video so readers can watch on its website.</p>
			<p>Get automatic thumbnail tries the provider&apos;s public preview. If it is unavailable, upload a custom image or choose one from your image library. Set a title and alt text, then adjust the play button, alignment, width, background, border and spacing. Apply thumbnail settings after changing the play button so the image itself contains your changes.</p>
			<p>Choose Hosted, Embedded or the newsletter default for each video thumbnail. Embedded delivery sends the preview image with the email through a compatible email provider. Your stored image remains available for editing and web previews. Add both a video URL and a thumbnail before sending.</p>

			<FigureHelp src="/help/writing/video-block.webp" alt="A sample Video block with a clickable thumbnail and right-side controls for custom images, title and alt text." caption="A Video block and its thumbnail settings" />
			<h2 id="social-blocks">Social links</h2>
			<p>Choose Social in the content dock, then click its icons to open the settings panel. Add your profile URLs, choose the icon style, size, spacing and alignment, and reorder or remove networks. Every network needs an icon and a destination before sending.</p>
			<p>In <LinkApp href="/newsletters/socials">Social networks and images</LinkApp>, add new platforms, upload their icons and save optional default links. Choose which networks appear in new blocks. Existing blocks keep their saved links and icons when you change the defaults.</p>
			<FigureHelp src="/help/writing/social-block.webp" alt="A sample campaign with centered social icons and a right-side panel for profile links and accessible descriptions." caption="A Social block and its settings" />
			<h2 id="image-delivery">Hosted and embedded images</h2>
			<p>Each picture and Social block can use the newsletter default, load a hosted image or embed its image in the email. Hosted images keep the email smaller. Embedded images travel as inline attachments, so the recipient does not need your image server to display them. Their appearance depends on the recipient&apos;s email app.</p>
			<p>Set the newsletter default in <LinkApp href="/newsletters/socials">Social networks and images</LinkApp>. Your stored images remain available for editing and web previews with either choice. Embedded delivery currently requires a compatible email provider and an image uploaded to your account, or a built-in social icon. Embedded files total at most 8 MB per email; use hosted delivery for larger pictures. A picture that follows the newsletter default stays hosted when it can&apos;t be embedded, like one linked from another site or one too big to attach, so changing the default never stops an older issue. A picture you set to Embedded yourself must be embedded: if it can&apos;t be, the send or test stops before anything goes out and says what to fix.</p>

			<h2 id="html">HTML blocks</h2>
			<p>
				Type <kbd>/</kbd> and pick HTML to add your own HTML to an issue, like a table, a sponsor&apos;s banner or a signature. Paste or type it, and its tags, attributes and styles show in color. Click Done or press <kbd>Esc</kbd> when
				you&apos;re finished: the block then shows what readers get, in your newsletter&apos;s email design. Click it to change it
				again, and <Link href={getHelpHref("writing", "preview")}>Preview</Link> shows it in the whole email.
			</p>
			<FigureHelp
				src="/help/writing/html-block.webp"
				alt="Two HTML blocks in the editor: a sponsor's card as readers get it, and a sign-off open with its code in color."
				caption="Two HTML blocks, the second one open"
			/>
			<p>
				To delete a block, click it, then the bin next to Done. It goes at once, and{" "}
				<Link href={getHelpHref("writing", "deleting-blocks")}>Undo</Link> brings it back.
			</p>
			<p>
				Your emails and your website get the same block, cleaned first. Scripts, forms, frames, <code>&lt;style&gt;</code> tags,
				classes and ids are removed, and so are styles that could move the block over the rest of the issue, like{" "}
				<code>position</code> or a negative margin. Style each element inline instead, with <code>style=&quot;…&quot;</code>.
				Tables, colors, fonts, borders, spacing and sizes stay. Links and pictures need their full address, starting with{" "}
				<code>https://</code>. Names and fields work in its text and its links.
			</p>
			<p>
				While you edit a block, the line under its HTML points out tags that don&apos;t match up, like a <code>&lt;table&gt;</code>{" "}
				never closed, which can take in everything after it, and what the cleaning removes. Once you click Done, an{" "}
				<Link href={getHelpHref("writing", "problems")}>amber dot</Link> beside the block does, and so does the{" "}
				<Link href={getHelpHref("sending", "review")}>review step</Link>.
			</p>
			<p>
				Embeds that need a script, like a video player or a signup form from another site, can&apos;t work in an email: link to
				them instead. Where the HTML sets no font or color, your website shows the block in its own.
			</p>

			<h2 id="moving-blocks">Moving blocks</h2>
			<p>
				With a mouse, a grip appears to the left of the paragraph, heading, list, picture, box, button, HTML block or section under the pointer. Drag
				it to move the block, and a line shows where it lands. Click it to select the block. From the keyboard,{" "}
				<kbd>⌘ Shift ↑</kbd> and{" "}
				<kbd>⌘ Shift ↓</kbd> (<kbd>Ctrl</kbd> instead of <kbd>⌘</kbd> on Windows) move the block the cursor is in. Moves undo like any
				other change.
			</p>
			<FigureHelp
				src="/help/writing/moving-blocks.webp"
				alt="A paragraph dragged by its grip, with the line where it will land."
				caption="Dragging a block by its grip"
			/>

			<h2 id="deleting-blocks">Deleting blocks</h2>
			<p>
				Pictures, buttons and HTML blocks go as soon as you delete them, from Delete in their settings, their bin or the keyboard. A message at the top of
				the page says so for a few seconds: click Undo in it to bring the block back, or press <kbd>⌘ Z</kbd> (<kbd>Ctrl Z</kbd> on
				Windows), as its button shows. The message goes once you change something else, since undo would take that back first.
			</p>

			<h2 id="problems">What may look broken</h2>
			<p>
				A dot to the left of a block marks something in it that may look broken to your readers. Amber is something to check, like a
				link with no address or to a placeholder like example.com, a <Link href={getHelpHref("writing", "first-name")}>name or field</Link>{" "}
				that leaves a gap for readers without one, an HTML block whose tags don&apos;t match up, or text left from a template, like
				Lorem ipsum. Red is something to fix before the issue can go out, like a button without its link.
			</p>
			<FigureHelp
				src="/help/writing/problems.webp"
				alt="A draft with amber and red dots beside its blocks, one saying its link goes to example.com, a placeholder address."
				caption="Dots beside what may look broken"
			/>
			<p>
				Point at a dot to read what&apos;s wrong, or click it to go there: the words in question are selected, a button opens its link
				and an HTML block its HTML, with what&apos;s wrong under it. The{" "}
				<Link href={getHelpHref("sending", "review")}>review step</Link> lists them all, and its Edit content brings you back to each,
				lit for a moment.
			</p>

			<h2 id="first-name">Names and fields in your emails</h2>
			<p>
				<code>{"{{first_name}}"}</code> shows each reader&apos;s first name. Type <kbd>/</kbd> and pick First name under
				Personalize, or click the person icon at the end of the subject. Both add <code>{"{{first_name|there}}"}</code>: the word
				after the bar is what readers without a first name see, so &ldquo;Hi {"{{first_name|there}}"}&rdquo; reads &ldquo;Hi
				Jane&rdquo; or &ldquo;Hi there&rdquo;. Change the word, or delete it and keep the bar, <code>{"{{first_name|}}"}</code>, to show
				nothing. A name or field without a bar gets an <Link href={getHelpHref("writing", "problems")}>amber dot</Link> beside its line,
				since readers without a value would see a gap. In the editor, names and fields show on a gray background: point at one to see
				its sentence as Jane reads it, and as a reader without a value does.
			</p>
			<p>
				You can also type them. After <kbd>{"{{"}</kbd>, the editor suggests the first name and your fields, narrowing them as you
				type: press <kbd>Enter</kbd> or click one to finish its tag, or keep typing to ignore them. <kbd>Esc</kbd> hides them.
			</p>
			<FigureHelp
				src="/help/writing/fields.webp"
				alt="The editor suggesting the first name and the account's fields as a tag is typed: company, plan, points and birthday."
				caption="Fields suggested as you type"
			/>
			<p>
				Your own <Link href={getHelpHref("contacts", "fields")}>contact fields</Link> work the same way, by their key:{" "}
				<code>{"{{birthday}}"}</code>, <code>{"{{plan|free}}"}</code>. The slash menu shows them after the first name, and typing a
				field&apos;s name after the slash, like <kbd>/birthday</kbd>, finds it right away. Add a field, at their end, opens your
				fields: name a new one and press <kbd>Enter</kbd>, and it goes where you typed the slash. The person icon in the subject
				lists them too, once you have some, and ends on How to add names and fields to contacts, which opens{" "}
				<Link href={getHelpHref("contacts", "fields")}>Adding fields, step by step</Link>. Text shows as it is, a number with its
				thousands separated (1,250), and a date written out (April 12, 1991). A reader without a value sees the fallback, or
				nothing. Tags never show in emails: they&apos;re for picking who gets an issue, with{" "}
				<Link href={getHelpHref("contacts", "segments")}>segments</Link>, and who sees a{" "}
				<Link href={getHelpHref("writing", "sections")}>section</Link> of it.
			</p>
			<p>
				Names and fields work in the subject, the preview text and the content, and in your welcome and confirmation emails. Your
				website and its issue pages always show the fallback, so no reader&apos;s details are ever public. The preview shows the
				name Jane, with no field values, or the details of a contact you{" "}
				<Link href={getHelpHref("writing", "preview")}>pick in it</Link>. Test emails show Jane too, or your own first name and
				fields if you&apos;re one of your contacts. The review step flags any other <code>{"{{...}}"}</code>, like a tag from another
				platform or a field you deleted, since it would go out as written.
			</p>

			<h2 id="sections">Sections for some readers</h2>
			<p>
				A section shows part of an issue to some of your readers only, or only in your emails or only on your website. Everyone you
				send the issue to still gets it: a reader a section isn&apos;t for gets the same email without it.
			</p>
			<p>
				Select the text of the blocks you want in it, then click Who sees this, the dashed square at the end of the bar above them.
				Or type <kbd>/</kbd>, pick Section and write in it. A dashed outline shows where the section starts and ends, and its label
				says who sees it and where, like &ldquo;Only readers tagged vip · Email only&rdquo;. Click the label to change them:
			</p>
			<ul>
				<li>
					<strong>Who sees this section</strong>: everyone, readers with a <Link href={getHelpHref("contacts", "tags")}>tag</Link>,
					or readers in a <Link href={getHelpHref("contacts", "segments")}>segment</Link>, like your newest subscribers or those who
					opened lately. Everyone except them turns it around, for readers without the tag or outside the segment. New segment, at
					the bottom of the list, makes one without leaving the issue.
				</li>
				<li>
					<strong>Show it in</strong>: email and web, email only or web only. Your website doesn&apos;t know who&apos;s reading, so
					a section becomes email only once you pick its readers. Put it back on the web, and every visitor of your website sees it.
				</li>
			</ul>
			<p>
				Under them, how many of the readers who get the issue see the section in their email. Add a version for everyone else puts
				the opposite section right under it, for the readers this one leaves out, like a thank you for your VIPs and an invitation
				for everyone else. Remove the section, keep its content puts its blocks back in the issue for everyone.
			</p>
			<FigureHelp
				src="/help/writing/section.webp"
				alt="A section in the editor with its settings open: only readers tagged member, in emails only, which 12 of the issue's 48 readers see."
				caption="A section and who sees it"
			/>
			<p>
				Each reader&apos;s sections are decided as their email goes out, with their tags and segments then. A section can hold{" "}
				<Link href={getHelpHref("writing", "html")}>HTML blocks</Link> but not another section, and an HTML block&apos;s HTML
				can&apos;t make one: put the section around the block. An issue holds {MAX_SECTIONS} sections naming {MAX_SECTION_GROUPS}{" "}
				tags or segments at most. A segment
				can&apos;t be deleted while a scheduled or sending issue has a section for it. In a draft, a section whose segment was
				deleted gets a <Link href={getHelpHref("writing", "problems")}>red dot</Link> and holds the issue until you pick who sees it.
			</p>
			<p>
				The <Link href={getHelpHref("writing", "preview")}>preview</Link> shows the issue as each reader gets it, and a test email has
				every section an email can have, to check them all in your inbox. Sections are for what matters to each reader, not for
				secrets: a reader can forward their email.
			</p>

			<h2 id="preview">Preview and test emails</h2>
			<p>
				Preview, in the write step and in the <strong>⋯</strong> menu at any step, shows the email in a mail app&apos;s window on a
				desktop, or in Gmail on a phone: the inbox first, with a fingertip tapping the issue&apos;s row until you open it, then the
				email.
				On your own phone, Mobile shows the email itself, edge to edge. A link you click in it opens in a new tab, and the preview
				stays on the email. Press <kbd>Esc</kbd> to close it. Once the campaign is sent, Preview stays in the <strong>⋯</strong>{" "}
				menu at the top of its <Link href={getHelpHref("sending", "report")}>report</Link>.
			</p>
			<p>
				Sample reader, at the top left, shows the email as a reader called Jane gets it. Click it to pick one of your active
				contacts instead, the newest first, each with their picture as on the <LinkApp href="/contacts">Contacts page</LinkApp>, or
				find one by typing any part of their email address or first name. The subject, the preview text and the email then read as
				that person gets them, with their first name and field values, or the fallbacks where they have none, and the{" "}
				<Link href={getHelpHref("writing", "sections")}>sections</Link> their tags and segments get them. They stay picked while the
				campaign is open. An issue with sections also lists the readers they name, like readers tagged vip, each called Jane: Jane
				has no tags and is in no segment. How to add names and fields to contacts, at the bottom of the list, opens{" "}
				<Link href={getHelpHref("contacts", "fields")}>Adding fields, step by step</Link>.
			</p>
			<FigureHelp
				src="/help/writing/preview.webp"
				alt="The email preview as Lena gets an issue: her Pro plan, the 1,250 trees she planted and the day she joined, filled in from her fields."
				caption="The preview as one of your contacts"
			/>
			<p>
				Send a test email, in the same menu, sends the email as saved to your account&apos;s address, with [Test] before the subject,
				and every section an email of it can have. Nobody else gets it.{isCloud() && " It counts toward your plan's emails."} The
				review step reminds you when you haven&apos;t
				sent one. If it lands in spam: <Link href={getHelpHref("deliverability", "test-in-spam")}>When a test lands in spam</Link>
			</p>

			<h2 id="other">Duplicate, discard and HTML</h2>
			<p>
				The <strong>⋯</strong> menu also duplicates a campaign into a new draft, or discards a draft. A sent campaign can&apos;t be
				changed, but it can come off your website.{" "}
				<Link href={getHelpHref("website", "remove-issue")}>Removing an issue</Link>
			</p>
			<p>
				To start every issue from the same layout, keep a draft with its sections and your sign-off, and copy it each time: New, then
				Copy a campaign.
			</p>
			<p>
				A campaign made with the API or an AI assistant can be a whole HTML document. The dashboard then shows its HTML to edit, and it
				needs <code>{UNSUBSCRIBE_PLACEHOLDER}</code> where the unsubscribe link goes.{" "}
				<Link href={getHelpHref("api-and-ai")}>API and AI assistants</Link>
			</p>
			<p>
				To add HTML to an issue you write in the editor, use an <Link href={getHelpHref("writing", "html")}>HTML block</Link>.
			</p>
			<p>
				When you&apos;re done, <Link href={getHelpHref("sending")}>send or schedule it</Link>.
			</p>
		</ArticleHelp>
	);
}

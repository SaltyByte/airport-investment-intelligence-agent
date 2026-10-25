// Test-only inputs for the ingest parsers.
import { parse } from 'csv-parse/sync';

export const csv = (text: string): Record<string, string>[] =>
  parse(text, { columns: true });

// FAA enplanements sheet sample: shared strings plus a sheet with two ranked rows and a footer count.
export const SHARED = `<sst><si><t>Rank</t></si><si><t>RO</t></si><si><t>ST</t></si><si><t>Locid</t></si><si><t>City</t></si><si><t>Airport Name</t></si><si><t>S/L</t></si><si><t>Hub</t></si><si><t>CY 25 Enplanements</t></si><si><t>CY 24 Enplanements</t></si><si><t>% Change</t></si><si><t>NE</t></si><si><t>MA</t></si><si><t>BOS</t></si><si><t>Boston</t></si><si><r><t>General Edward Lawrence Logan </t></r><r><t>International &amp; Co</t></r></si><si><t>P</t></si><si><t>L</t></si><si><t>Large Count</t></si><si><t>CS</t></si><si><t>None</t></si><si><t>AK</t></si><si><t>IAN</t></si><si><t>Kiana</t></si><si><t>Bob Baker Memorial</t></si><si><t>AL</t></si></sst>`;
const header = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  .map((i) => `<c r="${'ABCDEFGHIJK'[i]}1" t="s"><v>${i}</v></c>`)
  .join('');
export const SHEET = `<worksheet><sheetData>
<row r="1">${header}</row>
<row r="2"><c r="A2"><v>16</v></c><c r="B2" t="s"><v>11</v></c><c r="C2" t="s"><v>12</v></c><c r="D2" t="s"><v>13</v></c><c r="E2" t="s"><v>14</v></c><c r="F2" t="s"><v>15</v></c><c r="G2" t="s"><v>16</v></c><c r="H2" t="s"><v>17</v></c><c r="I2"><v>21021153</v></c><c r="J2"><v>21090721</v></c><c r="K2"><v>-3.3E-3</v></c></row>
<row r="3"><c r="A3"><v>564</v></c><c r="B3" t="s"><v>25</v></c><c r="C3" t="s"><v>21</v></c><c r="D3" t="s"><v>22</v></c><c r="E3" t="s"><v>23</v></c><c r="F3" t="s"><v>24</v></c><c r="G3" t="s"><v>19</v></c><c r="H3" t="s"><v>20</v></c><c r="I3"><v>2509</v></c><c r="J3"><v>2555</v></c></row>
<row r="4"><c r="A4"/><c r="D4"><v>30</v></c><c r="E4" t="s"><v>18</v></c></row>
</sheetData></worksheet>`;

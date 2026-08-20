/* ==========================================================================
   PPCs of India — responsive data tables
   --------------------------------------------------------------------------
   The PPC list and the special-cancellation pages are wide, many-column
   tables. On a narrow screen they previously forced constant left/right
   scrolling: a card layout existed in CSS but depended on each <td> carrying a
   data-label attribute, and almost none of the ~10,000 cells had one.

   Rather than hand-editing every cell, this script derives the label for each
   column from the table's own <thead> and stamps it onto the matching cells.
   That keeps the markup as the single source of truth: add or reorder a column
   and the mobile labels follow automatically.

   On narrow viewports each row then renders as a tile with the heading on the
   left and its value on the right (see the .ppc-cards rules in theme.css).
   ========================================================================== */
(function () {
	'use strict';

	/** Read the column headings of a table, expanding any colspans. */
	function headings(table) {
		var head = table.tHead;
		if (!head || !head.rows.length) return [];
		// Use the last header row: if a table has a grouped header, the last
		// row is the one that names the individual columns.
		var row = head.rows[head.rows.length - 1];
		var out = [];
		for (var i = 0; i < row.cells.length; i++) {
			var cell = row.cells[i];
			var text = (cell.textContent || '').replace(/\s+/g, ' ').trim();
			var span = parseInt(cell.getAttribute('colspan') || '1', 10);
			if (isNaN(span) || span < 1) span = 1;
			for (var s = 0; s < span; s++) out.push(text);
		}
		return out;
	}

	function labelTable(table) {
		var cols = headings(table);
		if (!cols.length) return;

		var bodies = table.tBodies.length ? table.tBodies : [table];
		for (var b = 0; b < bodies.length; b++) {
			var rows = bodies[b].rows;
			for (var r = 0; r < rows.length; r++) {
				var cells = rows[r].cells;
				// Skip decorative separator rows: a single spanning cell, or a
				// cell whose only content is an <hr>. Labelling these would
				// produce an empty tile with a stray heading in card mode.
				if (cells.length <= 1 || (cells[0] && cells[0].querySelector('hr'))) {
					rows[r].classList.add('ppc-row-separator');
					continue;
				}
				var col = 0;
				for (var c = 0; c < cells.length; c++) {
					var cell = cells[c];
					if (cell.tagName === 'TH') {
						col += parseInt(cell.getAttribute('colspan') || '1', 10) || 1;
						continue;
					}
					if (!cell.hasAttribute('data-label') && cols[col]) {
						cell.setAttribute('data-label', cols[col]);
					}
					// An image-only cell reads better without a label repeated.
					if (cell.querySelector('img') && !cell.textContent.trim()) {
						cell.setAttribute('data-media', '');
					}
					col += parseInt(cell.getAttribute('colspan') || '1', 10) || 1;
				}
			}
		}

		// Opt the table into the card treatment and let it use the full width.
		table.classList.add('ppc-cards');
	}

	/** Let wide tables use the full window width instead of the text measure. */
	function widenContainers(table) {
		var wrap = table.closest
			? table.closest('.table-container, .table-responsive, .ppc-table-wrap')
			: null;
		if (wrap) wrap.classList.add('ppc-table-wide');
	}

	function init() {
		var tables = document.querySelectorAll('table');
		for (var i = 0; i < tables.length; i++) {
			var t = tables[i];
			// Only the real data tables: they have a proper header row and more
			// than a couple of columns. Leaves the 2-column info tables alone.
			if (!t.tHead || !t.tHead.rows.length) continue;
			var cols = t.tHead.rows[t.tHead.rows.length - 1].cells.length;
			if (cols < 3) continue;
			labelTable(t);
			widenContainers(t);
		}
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})();
